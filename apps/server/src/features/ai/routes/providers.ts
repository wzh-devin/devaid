import type {
  ApiKeyCredentialRequest,
  ProviderConfigUpdate,
} from '@devaid/ai-contracts'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import { ModelServiceError, type ModelService } from '../model-service.ts'
import type { OAuthSessionService } from '../oauth-session-service.ts'

function isProviderConfig(value: unknown): value is ProviderConfigUpdate {
  if (!value || typeof value !== 'object') return false
  const models = (value as { models?: unknown }).models
  return (
    Array.isArray(models) &&
    models.length <= 500 &&
    models.every(
      (model) =>
        !!model &&
        typeof model === 'object' &&
        typeof (model as { id?: unknown }).id === 'string' &&
        (model as { id: string }).id.length <= 512 &&
        ((model as { name?: unknown }).name === undefined ||
          (typeof (model as { name?: unknown }).name === 'string' &&
            (model as { name: string }).name.length <= 512)),
    )
  )
}

function modelServiceError(error: unknown) {
  return error instanceof ModelServiceError
    ? { code: error.code, message: error.message, status: error.status }
    : {
        code: 'PROVIDER_CONFIG_FAILED',
        message: 'Provider 配置操作失败。',
        status: 500 as const,
      }
}

/** 创建 Provider 与凭证路由。 */
export function createProviderRoutes(
  models: ModelService,
  oauth: OAuthSessionService,
) {
  const routes = new Hono()

  routes.get('/', async (c) => c.json(await models.listProviders()))

  routes.get('/:id/models', (c) => {
    const catalog = models.getProviderModels(c.req.param('id'))
    return catalog
      ? c.json(catalog)
      : c.json(
          { code: 'PROVIDER_NOT_FOUND', message: 'Provider 不存在。' },
          404,
        )
  })

  routes.put(
    '/:id/config',
    bodyLimit({
      maxSize: 256 * 1024,
      onError: (c) =>
        c.json({ code: 'REQUEST_TOO_LARGE', message: '请求内容过大。' }, 413),
    }),
    async (c) => {
      const body = await c.req.json<unknown>().catch(() => undefined)
      if (!isProviderConfig(body)) {
        return c.json(
          { code: 'INVALID_PROVIDER_CONFIG', message: '模型配置无效。' },
          400,
        )
      }
      try {
        const providerId = c.req.param('id')
        await models.saveProviderConfig(providerId, body)
        const provider = await models.getProviderInfo(providerId)
        return c.json(provider)
      } catch (error) {
        const response = modelServiceError(error)
        return c.json(
          { code: response.code, message: response.message },
          response.status,
        )
      }
    },
  )

  routes.put(
    '/:id/credential',
    bodyLimit({
      maxSize: 20 * 1024,
      onError: (c) =>
        c.json({ code: 'REQUEST_TOO_LARGE', message: '请求内容过大。' }, 413),
    }),
    async (c) => {
      const body = await c.req
        .json<ApiKeyCredentialRequest>()
        .catch(() => undefined)
      const apiKey = body?.apiKey?.trim()
      if (!apiKey || apiKey.length > 16_384) {
        return c.json(
          { code: 'INVALID_API_KEY', message: '请输入有效的 API Key。' },
          400,
        )
      }
      try {
        await models.saveApiKey(c.req.param('id'), apiKey)
        return c.body(null, 204)
      } catch {
        return c.json(
          { code: 'CREDENTIAL_SAVE_FAILED', message: 'API Key 保存失败。' },
          400,
        )
      }
    },
  )

  routes.delete('/:id/credential', async (c) => {
    const providerId = c.req.param('id')
    try {
      oauth.cancelProvider(providerId)
      await models.deleteCredential(providerId)
      return c.body(null, 204)
    } catch {
      return c.json(
        { code: 'CREDENTIAL_DELETE_FAILED', message: '凭证删除失败。' },
        400,
      )
    }
  })

  routes.delete('/:id', async (c) => {
    const providerId = c.req.param('id')
    try {
      oauth.cancelProvider(providerId)
      await models.deleteProvider(providerId)
      return c.body(null, 204)
    } catch (error) {
      const response = modelServiceError(error)
      return c.json(
        { code: response.code, message: response.message },
        response.status,
      )
    }
  })

  return routes
}
