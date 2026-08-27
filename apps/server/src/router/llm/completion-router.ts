import type { ModelService } from '@devaid/llm'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import { createCompletionController } from '../../controller/llm/completion-controller.ts'

/** 注册无会话持久化的单次模型 SSE 路由。 */
export function createCompletionRouter(models: ModelService) {
  const router = new Hono()
  router.post(
    '/stream',
    bodyLimit({
      maxSize: 2 * 1024 * 1024,
      onError: (context) =>
        context.json(
          { code: 'REQUEST_TOO_LARGE', message: '请求内容过大。' },
          413,
        ),
    }),
    createCompletionController(models),
  )
  return router
}
