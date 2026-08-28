import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createWorkspace,
  listWorkspaces,
  selectWorkspace,
  WorkspaceApiError,
} from './workspace-api.ts'

test('workspace API lists and creates persisted workspaces', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    if (init?.method === 'POST') {
      assert.equal(input, '/api/workspaces')
      assert.deepEqual(JSON.parse(String(init.body)), {
        path: '/tmp/devaid-workspace',
      })
      return Response.json({
        available: true,
        createdAt: 1,
        id: 'workspace-1',
        name: 'devaid-workspace',
      })
    }
    assert.equal(input, '/api/workspaces')
    return Response.json([])
  }

  try {
    assert.deepEqual(await listWorkspaces(), [])
    assert.equal(
      (await createWorkspace('/tmp/devaid-workspace')).id,
      'workspace-1',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('workspace selection uses the Server native picker and handles cancel', async () => {
  const originalFetch = globalThis.fetch
  let cancelled = false
  globalThis.fetch = async (input, init) => {
    assert.equal(input, '/api/workspaces/select')
    assert.equal(init?.method, 'POST')
    assert.equal(init?.headers?.['x-devaid-request'], 'workspace-picker')
    if (cancelled) return new Response(null, { status: 204 })
    return Response.json(
      {
        available: true,
        createdAt: 1,
        id: 'workspace-1',
        name: 'devaid-workspace',
      },
      { status: 201 },
    )
  }

  try {
    assert.equal((await selectWorkspace())?.id, 'workspace-1')
    cancelled = true
    assert.equal(await selectWorkspace(), null)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('workspace API preserves stable server errors', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    Response.json(
      { code: 'WORKSPACE_DUPLICATE', message: '工作区已存在。' },
      { status: 409 },
    )

  try {
    await assert.rejects(
      createWorkspace('/tmp/devaid-workspace'),
      (error) =>
        error instanceof WorkspaceApiError &&
        error.code === 'WORKSPACE_DUPLICATE' &&
        error.status === 409,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
