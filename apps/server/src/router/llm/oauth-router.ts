import type { OAuthSessionService } from '@devaid/llm'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import { createOAuthController } from '../../controller/llm/oauth-controller.ts'

/** 注册 OAuth 会话轮询路由；Provider callback 由 Pi AI 接收。 */
export function createOAuthRouter(oauth: OAuthSessionService) {
  const router = new Hono()
  const controller = createOAuthController(oauth)

  router.post(
    '/sessions',
    bodyLimit({
      maxSize: 8 * 1024,
      onError: (context) =>
        context.json(
          { code: 'REQUEST_TOO_LARGE', message: '请求内容过大。' },
          413,
        ),
    }),
    controller.create,
  )
  router.get('/sessions/:id', controller.get)
  router.post(
    '/sessions/:id/input',
    bodyLimit({
      maxSize: 20 * 1024,
      onError: (context) =>
        context.json(
          { code: 'REQUEST_TOO_LARGE', message: '请求内容过大。' },
          413,
        ),
    }),
    controller.input,
  )
  router.delete('/sessions/:id', controller.cancel)

  return router
}
