import type { ModelService, OAuthSessionService } from '@oh-my-harness/llm'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import { createProviderController } from '../../controller/llm/provider-controller.ts'

/** 注册 Provider、模型配置与凭证路由。 */
export function createProviderRouter(
  models: ModelService,
  oauth: OAuthSessionService,
) {
  const router = new Hono()
  const controller = createProviderController(models, oauth)

  router.get('/', controller.list)
  router.get('/:id/models', controller.getModels)
  router.put(
    '/:id/config',
    bodyLimit({
      maxSize: 256 * 1024,
      onError: (context) =>
        context.json(
          { code: 'REQUEST_TOO_LARGE', message: '请求内容过大。' },
          413,
        ),
    }),
    controller.saveConfig,
  )
  router.put(
    '/:id/credential',
    bodyLimit({
      maxSize: 20 * 1024,
      onError: (context) =>
        context.json(
          { code: 'REQUEST_TOO_LARGE', message: '请求内容过大。' },
          413,
        ),
    }),
    controller.saveApiKey,
  )
  router.delete('/:id/credential', controller.deleteCredential)
  router.delete('/:id', controller.deleteProvider)

  return router
}
