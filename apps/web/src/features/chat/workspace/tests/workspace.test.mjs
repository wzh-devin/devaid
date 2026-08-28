import assert from 'node:assert/strict'
import {
  findWorkspaceByThreadId,
  resolveComposerWorkspace,
} from '../data/workspace-data.ts'

const workspace = {
  available: true,
  id: 'workspace-assets',
  label: 'assets',
  threadIds: ['thread-1'],
}

assert.equal(findWorkspaceByThreadId([workspace], 'missing'), undefined)
assert.equal(findWorkspaceByThreadId([workspace], 'thread-1')?.id, workspace.id)
assert.deepEqual(resolveComposerWorkspace('workspace-assets'), {
  isSelectable: true,
  workspaceId: 'workspace-assets',
})
assert.deepEqual(
  resolveComposerWorkspace('workspace-notes', 'workspace-assets'),
  {
    isSelectable: false,
    workspaceId: 'workspace-assets',
  },
)

console.log('workspace selection checks passed')
