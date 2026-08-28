import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { createApp } from '../../app.ts'
import type {
  ProviderInfoDto,
  ProviderModelInfoDto,
} from '../../dto/llm/provider-dto.ts'

test('AI 路由分离授权、候选目录和已保存模型配置', async (context) => {
  const app = await createApp(await mkdtemp(join(tmpdir(), 'devaid-routes-')))
  context.after(() => app.close())
  const providers = (await (
    await app.request('/api/ai/providers')
  ).json()) as ProviderInfoDto[]
  assert.deepEqual(
    providers.map((provider) => provider.providerId),
    [
      'deepseek',
      'openai',
      'openai-codex',
      'openrouter',
      'minimax-cn',
      'google',
      'anthropic',
      'moonshotai-cn',
      'zai-coding-cn',
    ],
  )
  assert.ok(providers.every((provider) => provider.models.length === 0))
  assert.ok(providers.every((provider) => !provider.ready))

  const deepseekModels = (await (
    await app.request('/api/ai/providers/deepseek/models')
  ).json()) as ProviderModelInfoDto[]
  assert.deepEqual(
    deepseekModels.map((model) => model.id),
    ['deepseek-v4-flash', 'deepseek-v4-pro'],
  )
  assert.ok(deepseekModels.every((model) => model.name === model.id))
  assert.equal(
    (await app.request('/api/ai/providers/missing/models')).status,
    404,
  )

  const saved = await app.request('/api/ai/providers/deepseek/credential', {
    body: JSON.stringify({ apiKey: 'test-key' }),
    headers: { 'content-type': 'application/json' },
    method: 'PUT',
  })
  assert.equal(saved.status, 204)
  const authorized = (await (
    await app.request('/api/ai/providers')
  ).json()) as ProviderInfoDto[]
  const authorizedDeepseek = authorized.find(
    (provider) => provider.providerId === 'deepseek',
  )
  assert.equal(authorizedDeepseek?.authStatus, 'authorized')
  assert.equal(authorizedDeepseek?.configStatus, 'unconfigured')
  assert.equal(authorizedDeepseek?.ready, false)

  const configResponse = await app.request(
    '/api/ai/providers/deepseek/config',
    {
      body: JSON.stringify({ models: [{ id: 'deepseek-v4-flash' }] }),
      headers: { 'content-type': 'application/json' },
      method: 'PUT',
    },
  )
  assert.equal(configResponse.status, 200)
  const configuredDeepseek = (await configResponse.json()) as ProviderInfoDto
  assert.deepEqual(configuredDeepseek.models, [
    { id: 'deepseek-v4-flash', name: 'deepseek-v4-flash' },
  ])
  assert.equal(configuredDeepseek.ready, true)

  const disabledModel = await app.request('/api/ai/completions/stream', {
    body: JSON.stringify({
      messages: [{ content: 'hi', role: 'user' }],
      modelId: 'deepseek-v4-pro',
      providerId: 'deepseek',
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })
  assert.equal(disabledModel.status, 400)
  assert.equal(
    ((await disabledModel.json()) as { code: string }).code,
    'MODEL_NOT_ENABLED',
  )

  assert.equal(
    (
      await app.request('/api/ai/providers/deepseek/credential', {
        method: 'DELETE',
      })
    ).status,
    204,
  )
  const unauthorizedModel = await app.request('/api/ai/completions/stream', {
    body: JSON.stringify({
      messages: [{ content: 'hi', role: 'user' }],
      modelId: 'deepseek-v4-flash',
      providerId: 'deepseek',
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })
  assert.equal(unauthorizedModel.status, 409)
  assert.equal(
    ((await unauthorizedModel.json()) as { code: string }).code,
    'PROVIDER_NOT_READY',
  )

  const preserved = (await (
    await app.request('/api/ai/providers')
  ).json()) as ProviderInfoDto[]
  assert.equal(
    preserved.find((provider) => provider.providerId === 'deepseek')?.models[0]
      ?.id,
    'deepseek-v4-flash',
  )

  const removed = await app.request('/api/ai/providers/deepseek', {
    method: 'DELETE',
  })
  assert.equal(removed.status, 204)
  const afterDelete = (await (
    await app.request('/api/ai/providers')
  ).json()) as ProviderInfoDto[]
  assert.deepEqual(
    afterDelete.find((provider) => provider.providerId === 'deepseek')?.models,
    [],
  )
})

test('AI 路由拒绝超限正文和无效 Completion 请求', async (context) => {
  const app = await createApp(
    await mkdtemp(join(tmpdir(), 'devaid-route-limits-')),
  )
  context.after(() => app.close())
  const oversized = await app.request('/api/ai/providers/openai/credential', {
    body: JSON.stringify({ apiKey: 'x'.repeat(21 * 1024) }),
    headers: { 'content-type': 'application/json' },
    method: 'PUT',
  })
  assert.equal(oversized.status, 413)

  const invalidCompletion = await app.request('/api/ai/completions/stream', {
    body: JSON.stringify({ messages: [] }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })
  assert.equal(invalidCompletion.status, 400)

  const unknownModel = await app.request('/api/ai/providers/deepseek/config', {
    body: JSON.stringify({ models: [{ id: 'not-in-pi-ai' }] }),
    headers: { 'content-type': 'application/json' },
    method: 'PUT',
  })
  assert.equal(unknownModel.status, 400)
  assert.equal(
    ((await unknownModel.json()) as { code: string }).code,
    'MODEL_NOT_FOUND',
  )
})

test('应用启动时拒绝损坏的 Credential Store 且不覆盖原文件', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devaid-route-corrupt-'))
  const filePath = join(directory, 'credentials.json')
  await writeFile(filePath, '{broken', 'utf8')
  await assert.rejects(() => createApp(directory), /文件损坏/)
  assert.equal(await readFile(filePath, 'utf8'), '{broken')
})

test('应用启动时拒绝损坏的 Provider Config 且不允许模型回退', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devaid-config-corrupt-'))
  const filePath = join(directory, 'provider-config.json')
  await writeFile(filePath, '{broken', 'utf8')
  await assert.rejects(() => createApp(directory), /Provider Config 文件损坏/)
  assert.equal(await readFile(filePath, 'utf8'), '{broken')
})
