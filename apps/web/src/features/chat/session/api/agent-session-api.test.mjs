import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AgentSessionApiError,
  createAgentSession,
  parseAgentSseFrames,
  streamAgentMessage,
  updateAgentSessionModel,
} from './agent-session-api.ts'

test('session creation sends persisted workspace ownership', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    assert.equal(input, '/api/agent/sessions')
    assert.equal(init?.method, 'POST')
    assert.deepEqual(JSON.parse(String(init?.body)), {
      modelId: 'model-1',
      providerId: 'provider-1',
      workspaceId: 'workspace-1',
    })
    return Response.json({
      createdAt: 1,
      id: 'session-1',
      modelId: 'model-1',
      name: null,
      providerId: 'provider-1',
      workspaceId: 'workspace-1',
    })
  }

  try {
    const session = await createAgentSession({
      modelId: 'model-1',
      providerId: 'provider-1',
      workspaceId: 'workspace-1',
    })
    assert.equal(session.workspaceId, 'workspace-1')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('SSE parser handles multiple frames, CRLF, and a partial tail', () => {
  const parsed = parseAgentSseFrames(
    'event: start\r\ndata: {"type":"start","sessionId":"session-1"}\r\n\r\n' +
      'event: text_delta\ndata: {"type":"text_delta","delta":"你"}\n\n' +
      'event: text_delta\ndata: {"type":"text_',
  )

  assert.deepEqual(parsed.events, [
    { sessionId: 'session-1', type: 'start' },
    { delta: '你', type: 'text_delta' },
  ])
  assert.equal(parsed.remainder, 'event: text_delta\ndata: {"type":"text_')
})

test('POST stream joins network chunks before emitting events', async () => {
  const originalFetch = globalThis.fetch
  const encoder = new TextEncoder()
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'event: text_delta\ndata: {"type":"text_delta","delta":"你',
            ),
          )
          controller.enqueue(
            encoder.encode('好"}\n\nevent: done\ndata: {"type":"done",'),
          )
          controller.enqueue(
            encoder.encode('"entryId":"entry-1","stopReason":"stop"}\n\n'),
          )
          controller.close()
        },
      }),
      { status: 200 },
    )

  try {
    const events = []
    await streamAgentMessage('session-1', '你好', (event) => {
      events.push(event)
    })
    assert.deepEqual(events, [
      { delta: '你好', type: 'text_delta' },
      { entryId: 'entry-1', stopReason: 'stop', type: 'done' },
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('stream rejects JSON HTTP errors and invalid event JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    Response.json(
      { code: 'SESSION_BUSY', message: '会话正在运行。' },
      { status: 409 },
    )

  try {
    await assert.rejects(
      streamAgentMessage('session-1', '继续', () => {}),
      (error) =>
        error instanceof AgentSessionApiError &&
        error.code === 'SESSION_BUSY' &&
        error.status === 409,
    )
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.throws(
    () => parseAgentSseFrames('data: not-json\n\n'),
    (error) =>
      error instanceof AgentSessionApiError &&
      error.code === 'INVALID_STREAM_RESPONSE',
  )
})

test('model update sends the complete provider and model pair', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    assert.equal(input, '/api/agent/sessions/session-1')
    assert.equal(init?.method, 'PATCH')
    assert.deepEqual(JSON.parse(String(init?.body)), {
      modelId: 'model-2',
      providerId: 'provider-1',
    })
    return Response.json({
      createdAt: 1,
      id: 'session-1',
      modelId: 'model-2',
      name: null,
      providerId: 'provider-1',
      workspaceId: 'workspace-1',
    })
  }

  try {
    const session = await updateAgentSessionModel('session-1', {
      modelId: 'model-2',
      providerId: 'provider-1',
    })
    assert.equal(session.modelId, 'model-2')
  } finally {
    globalThis.fetch = originalFetch
  }
})
