import assert from 'node:assert/strict'
import { mkdtemp, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'

import { createJsonlSessionRepository } from './jsonl-session.ts'
import { SessionIndex } from './session-index.ts'

const metadata = {
  metadata: {
    modelId: 'test-model',
    providerId: 'test-provider',
    schemaVersion: 1,
  },
}

test('SQLite 目录从 JSONL 构建并按游标增量投影', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devaid-session-index-'))
  const repository = await createJsonlSessionRepository(directory)
  const session = await repository.create({ cwd: directory, ...metadata })
  await session.setName('初始名称')
  const sessionMetadata = await session.getMetadata()
  const index = await SessionIndex.create(directory, repository)
  try {
    assert.deepEqual(await index.list(), [
      {
        createdAt: sessionMetadata.createdAt,
        cwd: directory,
        id: sessionMetadata.id,
        modelId: 'test-model',
        name: '初始名称',
        providerId: 'test-provider',
      },
    ])

    await session.setName('增量名称')
    await session.appendEntry(
      {
        id: session.idGenerator.next(),
        modelId: 'test-model-2',
        provider: 'test-provider',
        type: 'model_change',
      },
      'main',
    )
    await index.changed(sessionMetadata.id)
    assert.equal((await index.list())[0]?.name, '增量名称')
    assert.equal((await index.list())[0]?.modelId, 'test-model-2')

    const source = await stat(sessionMetadata.path)
    const database = new DatabaseSync(join(directory, 'session-index.sqlite'))
    const row = database
      .prepare(
        'SELECT source_size, next_byte_offset, last_seq FROM sessions WHERE id = ?',
      )
      .get(sessionMetadata.id)
    database.close()
    assert.equal(row?.source_size, source.size)
    assert.equal(row?.next_byte_offset, source.size)
    assert.equal(row?.last_seq, 3)

    await repository.delete(sessionMetadata)
    await index.deleted(sessionMetadata.id)
    assert.deepEqual(await index.list(), [])
    if (process.platform !== 'win32') {
      assert.equal(
        (await stat(join(directory, 'session-index.sqlite'))).mode & 0o777,
        0o600,
      )
    }
  } finally {
    await index.close()
  }
})

test('投影不可用不影响 JSONL，下一实例从事实源补偿', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devaid-index-recovery-'))
  const repository = await createJsonlSessionRepository(directory)
  const session = await repository.create({ cwd: directory, ...metadata })
  const sessionMetadata = await session.getMetadata()
  const unavailable = await SessionIndex.create(directory, repository)
  await unavailable.close()

  await session.setName('索引离线后仍成功')
  await unavailable.changed(sessionMetadata.id)

  const recovered = await SessionIndex.create(directory, repository)
  try {
    assert.equal((await recovered.list())[0]?.name, '索引离线后仍成功')
  } finally {
    await recovered.close()
  }
})

test('已识别的旧版本索引自动重建，未知数据库保持不变', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devaid-index-identity-'))
  const repository = await createJsonlSessionRepository(directory)
  const session = await repository.create({ cwd: directory, ...metadata })
  const sessionMetadata = await session.getMetadata()
  const path = join(directory, 'session-index.sqlite')

  const initial = await SessionIndex.create(directory, repository)
  await initial.close()
  const outdated = new DatabaseSync(path)
  outdated.exec('PRAGMA user_version = 99')
  outdated.close()

  const rebuilt = await SessionIndex.create(directory, repository)
  try {
    assert.equal((await rebuilt.list())[0]?.id, sessionMetadata.id)
    const database = new DatabaseSync(path)
    assert.equal(database.prepare('PRAGMA user_version').get()?.user_version, 1)
    database.close()
  } finally {
    await rebuilt.close()
  }

  const unknownDirectory = await mkdtemp(
    join(tmpdir(), 'devaid-index-unknown-'),
  )
  const unknownRepository = await createJsonlSessionRepository(unknownDirectory)
  const unknownPath = join(unknownDirectory, 'session-index.sqlite')
  const unknown = new DatabaseSync(unknownPath)
  unknown.exec(`
    CREATE TABLE sentinel (value TEXT NOT NULL) STRICT;
    INSERT INTO sentinel VALUES ('keep-me');
    PRAGMA application_id = 123;
  `)
  unknown.close()
  const before = await readFile(unknownPath)
  const rejected = await SessionIndex.create(
    unknownDirectory,
    unknownRepository,
  )
  try {
    await assert.rejects(() => rejected.list(), /unavailable/)
    assert.deepEqual(await readFile(unknownPath), before)
  } finally {
    await rejected.close()
  }
})
