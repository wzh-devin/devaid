import assert from 'node:assert/strict'
import { appendFile, mkdtemp, readFile, readdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'

import { FileProviderConfigStore, ModelService } from '@devaid/llm'
import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
} from '@earendil-works/pi-ai'

import { createApp } from '../../app.ts'
import type {
  AgentSessionDto,
  AgentSessionMessagePageDto,
} from '../../dto/agent/session-dto.ts'
import type { WorkspaceDto } from '../../dto/workspace/workspace-dto.ts'

function parseSse(source: string) {
  return source
    .trim()
    .split('\n\n')
    .map((block) => {
      const event = block.match(/^event: (.+)$/m)?.[1]
      const data = block.match(/^data: (.+)$/m)?.[1]
      assert.ok(event && data)
      return { event, data: JSON.parse(data) as Record<string, unknown> }
    })
}

test('Agent HTTP API 持久化会话、流式回答并支持重启恢复', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'devaid-agent-routes-'))
  const faux = fauxProvider({
    models: [{ id: 'test-model' }, { id: 'test-model-2' }],
    provider: 'test-provider',
  })
  const models = createModels()
  models.setProvider(faux.provider)
  const configurations = new FileProviderConfigStore(directory)
  await configurations.replace('test-provider', [
    { id: 'test-model', name: 'Test Model' },
    { id: 'test-model-2', name: 'Test Model 2' },
  ])
  const service = new ModelService(models, configurations)
  const app = await createApp(directory, {
    models: service,
  })
  context.after(() => app.close())

  const workspaceResponse = await app.request('/api/workspaces', {
    body: JSON.stringify({ path: directory }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })
  assert.equal(workspaceResponse.status, 201)
  const workspace = (await workspaceResponse.json()) as WorkspaceDto
  assert.equal(workspace.available, true)

  const rejectedPath = await app.request('/api/agent/sessions', {
    body: JSON.stringify({
      cwd: '/tmp/forbidden',
      modelId: 'test-model',
      providerId: 'test-provider',
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })
  assert.equal(rejectedPath.status, 400)
  assert.equal(
    (
      await app.request('/api/agent/sessions', {
        body: JSON.stringify({
          modelId: 'test-model',
          providerId: 'unknown-provider',
          workspaceId: workspace.id,
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      })
    ).status,
    404,
  )
  assert.equal(
    (
      await app.request('/api/agent/sessions', {
        body: JSON.stringify({
          modelId: 'unknown-model',
          providerId: 'test-provider',
          workspaceId: workspace.id,
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      })
    ).status,
    400,
  )
  assert.equal(
    (await app.request('/api/agent/sessions/not-a-uuid')).status,
    400,
  )

  const createdResponse = await app.request('/api/agent/sessions', {
    body: JSON.stringify({
      modelId: 'test-model',
      name: '初始名称',
      providerId: 'test-provider',
      workspaceId: workspace.id,
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })
  assert.equal(createdResponse.status, 201)
  const created = (await createdResponse.json()) as AgentSessionDto
  assert.equal(created.workspaceId, workspace.id)
  assert.equal(
    (await app.request(`/api/agent/sessions/${created.id}`)).status,
    200,
  )
  assert.equal(
    (
      await app.request(`/api/agent/sessions/${created.id}/messages/stream`, {
        body: JSON.stringify({ content: 'x'.repeat(2 * 1024 * 1024) }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      })
    ).status,
    413,
  )

  faux.setResponses([fauxAssistantMessage('HTTP 持久化回答')])
  const streamResponse = await app.request(
    `/api/agent/sessions/${created.id}/messages/stream`,
    {
      body: JSON.stringify({ content: 'HTTP 测试' }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    },
  )
  assert.equal(streamResponse.status, 200)
  const events = parseSse(await streamResponse.text())
  assert.deepEqual(
    events.map((event) => event.event),
    ['start', 'text_delta', 'usage', 'done'],
  )

  const messages = (await (
    await app.request(`/api/agent/sessions/${created.id}/messages?limit=20`)
  ).json()) as AgentSessionMessagePageDto
  assert.deepEqual(
    messages.items.map((message) => [message.role, message.content]),
    [
      ['user', 'HTTP 测试'],
      ['assistant', 'HTTP 持久化回答'],
    ],
  )
  const newestPage = (await (
    await app.request(`/api/agent/sessions/${created.id}/messages?limit=1`)
  ).json()) as AgentSessionMessagePageDto
  assert.equal(newestPage.items[0]?.role, 'assistant')
  assert.equal(typeof newestPage.nextCursor, 'number')
  const olderPage = (await (
    await app.request(
      `/api/agent/sessions/${created.id}/messages?limit=1&before=${newestPage.nextCursor}`,
    )
  ).json()) as AgentSessionMessagePageDto
  assert.equal(olderPage.items[0]?.role, 'user')

  const renamed = (await (
    await app.request(`/api/agent/sessions/${created.id}`, {
      body: JSON.stringify({ name: '新名称' }),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    })
  ).json()) as AgentSessionDto
  assert.equal(renamed.name, '新名称')

  assert.equal(
    (
      await app.request(`/api/agent/sessions/${created.id}`, {
        body: JSON.stringify({ modelId: 'test-model-2' }),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      })
    ).status,
    400,
  )
  assert.equal(
    (
      await app.request(`/api/agent/sessions/${created.id}`, {
        body: JSON.stringify({
          modelId: 'test-model-2',
          name: '不能混合更新',
          providerId: 'test-provider',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      })
    ).status,
    400,
  )
  assert.equal(
    (
      await app.request(`/api/agent/sessions/${created.id}`, {
        body: JSON.stringify({
          modelId: 'unknown-model',
          providerId: 'test-provider',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      })
    ).status,
    400,
  )
  const modelUpdated = (await (
    await app.request(`/api/agent/sessions/${created.id}`, {
      body: JSON.stringify({
        modelId: 'test-model-2',
        providerId: 'test-provider',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    })
  ).json()) as AgentSessionDto
  assert.equal(modelUpdated.modelId, 'test-model-2')

  if (process.platform !== 'win32') {
    assert.equal((await stat(directory)).mode & 0o777, 0o700)
    assert.equal(
      (await stat(join(directory, 'workspaces.json'))).mode & 0o777,
      0o600,
    )
  }

  const sessionDirectory = (
    await readdir(join(directory, 'sessions'), {
      withFileTypes: true,
    })
  ).find((entry) => entry.isDirectory())
  assert.ok(sessionDirectory)
  const sessionFile = (
    await readdir(join(directory, 'sessions', sessionDirectory.name))
  ).find((name) => name.endsWith(`_${created.id}.jsonl`))
  assert.ok(sessionFile)
  const sessionPath = join(
    directory,
    'sessions',
    sessionDirectory.name,
    sessionFile,
  )
  if (process.platform !== 'win32') {
    assert.equal((await stat(sessionPath)).mode & 0o777, 0o600)
  }
  assert.match(await readFile(sessionPath, 'utf8'), /"type":"model_change"/u)

  await app.close()
  const sessionIndex = new DatabaseSync(
    join(directory, 'session-index.sqlite'),
    { readOnly: true },
  )
  const projected = sessionIndex
    .prepare('SELECT name, model_id FROM sessions WHERE id = ?')
    .get(created.id)
  sessionIndex.close()
  assert.equal(projected?.name, '新名称')
  assert.equal(projected?.model_id, 'test-model-2')

  await appendFile(sessionPath, '{"type":"message"', 'utf8')
  const reopened = await createApp(directory, {
    models: service,
  })
  context.after(() => reopened.close())
  const sessions = (await (
    await reopened.request('/api/agent/sessions')
  ).json()) as AgentSessionDto[]
  assert.equal(sessions[0]?.id, created.id)
  assert.equal(sessions[0]?.name, '新名称')
  assert.equal(sessions[0]?.modelId, 'test-model-2')
  assert.equal(sessions[0]?.workspaceId, workspace.id)
  assert.doesNotMatch(
    await readFile(sessionPath, 'utf8'),
    /\{"type":"message"$/u,
  )
  const restoredWorkspaces = (await (
    await reopened.request('/api/workspaces')
  ).json()) as WorkspaceDto[]
  assert.equal(restoredWorkspaces[0]?.id, workspace.id)

  assert.equal(
    (
      await reopened.request(`/api/agent/sessions/${created.id}`, {
        method: 'DELETE',
      })
    ).status,
    204,
  )
  assert.equal(
    (await reopened.request(`/api/agent/sessions/${created.id}`)).status,
    404,
  )
})
