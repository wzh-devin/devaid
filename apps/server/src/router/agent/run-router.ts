import type { AgentRuntime } from '@devaid/agent-runtime'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import { createAgentRunController } from '../../controller/agent/run-controller.ts'

/** 注册 Agent 的流式运行与显式终止路由。 */
export function createAgentRunRouter(runtime: AgentRuntime) {
  const router = new Hono()
  const controller = createAgentRunController(runtime)
  router.post(
    '/:id/messages/stream',
    bodyLimit({
      maxSize: 2 * 1024 * 1024,
      onError: (context) =>
        context.json(
          { code: 'REQUEST_TOO_LARGE', message: '请求内容过大。' },
          413,
        ),
    }),
    controller.prompt,
  )
  router.post('/:id/continue/stream', controller.continue)
  router.post('/:id/abort', controller.abort)
  return router
}
