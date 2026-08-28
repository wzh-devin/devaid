import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { WorkspaceError, WorkspaceStore } from './workspace-store.ts'

test('原生选择可复用已有工作区，普通创建仍拒绝重复路径', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devaid-workspace-store-'))
  const store = new WorkspaceStore(join(directory, 'data'))
  const created = await store.create(directory)

  assert.equal(
    (await store.create(directory, { reuseExisting: true })).id,
    created.id,
  )
  await assert.rejects(
    store.create(directory),
    (error) =>
      error instanceof WorkspaceError &&
      error.code === 'WORKSPACE_ALREADY_EXISTS',
  )
})
