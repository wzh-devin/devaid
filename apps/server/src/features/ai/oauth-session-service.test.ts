import assert from 'node:assert/strict'
import test from 'node:test'

import type { AuthInteraction, Models } from '@earendil-works/pi-ai'

import { OAuthSessionService } from './oauth-session-service.ts'

test('OAuth Session 自动应用授权前选项并且不暴露凭证', async () => {
  const models = {
    getProvider: () => ({ auth: { oauth: {} } }),
    login: async (
      _providerId: string,
      _type: string,
      interaction: AuthInteraction,
    ) => {
      const method = await interaction.prompt({
        message: '选择登录方式',
        options: [{ id: 'browser', label: '浏览器' }],
        type: 'select',
      })
      assert.equal(method, 'browser')
      interaction.notify({
        type: 'auth_url',
        url: 'https://example.test/oauth',
      })
      return {
        access: 'secret-access',
        expires: Date.now() + 60_000,
        refresh: 'secret-refresh',
        type: 'oauth',
      }
    },
  } as unknown as Models

  const service = new OAuthSessionService(models, 5_000)
  const created = service.create('openai-codex', 'browser')
  assert.equal(created.status, 'awaiting_provider')
  assert.equal(created.prompt, undefined)

  await new Promise((resolve) => setImmediate(resolve))
  const completed = service.get(created.sessionId)
  assert.equal(completed?.status, 'succeeded')
  assert.equal(completed?.authorizationUrl, 'https://example.test/oauth')
  assert.doesNotMatch(JSON.stringify(completed), /secret-access|secret-refresh/)
})

test('OAuth Session 到期后保留可轮询的 expired 终态', async () => {
  const models = {
    getProvider: () => ({ auth: { oauth: {} } }),
    login: async (
      _providerId: string,
      _type: string,
      interaction: AuthInteraction,
    ) =>
      new Promise((_resolve, reject) => {
        interaction.signal?.addEventListener(
          'abort',
          () => reject(new Error('aborted')),
          {
            once: true,
          },
        )
      }),
  } as unknown as Models

  const service = new OAuthSessionService(models, 10)
  const created = service.create('openrouter')
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.equal(service.get(created.sessionId)?.status, 'expired')
})
