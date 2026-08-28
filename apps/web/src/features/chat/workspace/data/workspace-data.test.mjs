import assert from 'node:assert/strict'
import test from 'node:test'
import { findWorkspaceByThreadId } from './workspace-data.ts'

test('findWorkspaceByThreadId uses persisted session ownership', () => {
  const workspaces = [
    { available: true, id: 'a', label: 'A', threadIds: [] },
    {
      available: true,
      id: 'b',
      label: 'B',
      threadIds: ['session-1'],
    },
  ]

  assert.equal(findWorkspaceByThreadId(workspaces, 'session-1')?.id, 'b')
  assert.equal(findWorkspaceByThreadId(workspaces, 'missing'), undefined)
})
