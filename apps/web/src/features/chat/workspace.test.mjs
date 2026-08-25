import assert from 'node:assert/strict'
import {
  findWorkspaceByDirectory,
  findWorkspaceByThreadId,
  resolveComposerWorkspace,
} from './workspace-data.ts'

const assetsHandle = {
  name: 'assets',
  isSameEntry: async (other) => other.name === 'assets',
}

const workspace = {
  directoryHandle: assetsHandle,
  id: 'workspace-assets',
  label: 'assets',
  threadIds: [],
}

assert.equal(findWorkspaceByThreadId([workspace], 'missing'), undefined)
assert.equal(findWorkspaceByThreadId([workspace], 'thread-1'), undefined)
assert.equal(
  findWorkspaceByThreadId([{ ...workspace, threadIds: ['thread-1'] }], 'thread-1')
    ?.id,
  workspace.id,
)

assert.equal(
  await findWorkspaceByDirectory([workspace], {
    name: 'assets',
    isSameEntry: async () => false,
  }),
  workspace,
)
assert.equal(
  await findWorkspaceByDirectory([workspace], {
    name: 'notes',
    isSameEntry: async () => false,
  }),
  undefined,
)

assert.deepEqual(resolveComposerWorkspace('assets'), {
  isSelectable: true,
  workspaceId: 'assets',
})
assert.deepEqual(resolveComposerWorkspace('mine-knowledge', 'assets'), {
  isSelectable: false,
  workspaceId: 'assets',
})

console.log('workspace directory checks passed')
