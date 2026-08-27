import type {
  OAuthSessionCreateRequest,
  OAuthSessionInputRequest,
} from '@devaid/ai-contracts'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import type { OAuthSessionService } from '../oauth-session-service.ts'

/** 创建 OAuth 会话轮询路由；Provider callback 由 Pi AI loopback listener 接收。 */
export function createOAuthRoutes(oauth: OAuthSessionService) {
  const routes = new Hono()

  routes.post(
    '/sessions',
    bodyLimit({
      maxSize: 8 * 1024,
      onError: (c) =>
        c.json({ code: 'REQUEST_TOO_LARGE', message: '请求内容过大。' }, 413),
    }),
    async (c) => {
      const body = await c.req
        .json<Partial<OAuthSessionCreateRequest>>()
        .catch(() => undefined)
      if (
        !body?.providerId ||
        (body.authMode !== undefined && typeof body.authMode !== 'string')
      ) {
        return c.json(
          { code: 'INVALID_PROVIDER', message: '缺少 Provider。' },
          400,
        )
      }
      try {
        return c.json(oauth.create(body.providerId, body.authMode), 201)
      } catch (error) {
        return c.json(
          { code: 'OAUTH_START_FAILED', message: (error as Error).message },
          400,
        )
      }
    },
  )

  routes.get('/sessions/:id', (c) => {
    const status = oauth.get(c.req.param('id'))
    return status
      ? c.json(status)
      : c.json(
          {
            code: 'OAUTH_SESSION_NOT_FOUND',
            message: 'OAuth 会话不存在或已过期。',
          },
          404,
        )
  })

  routes.post(
    '/sessions/:id/input',
    bodyLimit({
      maxSize: 20 * 1024,
      onError: (c) =>
        c.json({ code: 'REQUEST_TOO_LARGE', message: '请求内容过大。' }, 413),
    }),
    async (c) => {
      const body = await c.req
        .json<OAuthSessionInputRequest>()
        .catch(() => undefined)
      if (!body?.promptId || typeof body.value !== 'string') {
        return c.json(
          { code: 'INVALID_OAUTH_INPUT', message: 'OAuth 输入无效。' },
          400,
        )
      }
      try {
        return c.json(oauth.input(c.req.param('id'), body.promptId, body.value))
      } catch (error) {
        return c.json(
          { code: 'INVALID_OAUTH_INPUT', message: (error as Error).message },
          400,
        )
      }
    },
  )

  routes.delete('/sessions/:id', (c) => {
    oauth.cancel(c.req.param('id'))
    return c.body(null, 204)
  })

  return routes
}
