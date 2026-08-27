import assert from 'node:assert/strict'
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { FileCredentialStore } from './credential-store.ts'

test('LLM Credential Store 串行原子写入 version 1 文件并限制权限', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devaid-credentials-'))
  const store = new FileCredentialStore(directory)

  await store.modify('openai', async () => ({ key: 'first', type: 'api_key' }))
  await Promise.all([
    store.modify('openai', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return { key: 'second', type: 'api_key' }
    }),
    store.modify('openai', async (current) => {
      assert.equal(
        current?.type === 'api_key' ? current.key : undefined,
        'second',
      )
      return { key: 'third', type: 'api_key' }
    }),
  ])

  assert.deepEqual(await store.read('openai'), {
    key: 'third',
    type: 'api_key',
  })
  assert.equal(JSON.parse(await readFile(store.filePath, 'utf8')).version, 1)
  if (process.platform !== 'win32') {
    assert.equal((await stat(directory)).mode & 0o777, 0o700)
    assert.equal((await stat(store.filePath)).mode & 0o777, 0o600)
  }
})

test('Credential Store 损坏时失败关闭且保留原文件', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devaid-credentials-corrupt-'))
  const store = new FileCredentialStore(directory)
  await writeFile(store.filePath, '{broken', 'utf8')

  await assert.rejects(() => store.read('openai'), /文件损坏/)
  assert.equal(await readFile(store.filePath, 'utf8'), '{broken')
})
