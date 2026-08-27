import type {
  CompletionEvent,
  CompletionStreamRequest,
} from '@devaid/ai-contracts'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { streamSSE } from 'hono/streaming'

import { ModelServiceError, type ModelService } from '../model-service.ts'

function isRequest(value: unknown): value is CompletionStreamRequest {
  if (!value || typeof value !== 'object') return false
  const request = value as Partial<CompletionStreamRequest>
  return (
    typeof request.providerId === 'string' &&
    typeof request.modelId === 'string' &&
    Array.isArray(request.messages) &&
    request.messages.length > 0 &&
    request.messages.length <= 200 &&
    (request.systemPrompt === undefined ||
      (typeof request.systemPrompt === 'string' &&
        request.systemPrompt.length <= 100_000)) &&
    request.messages.every(
      (message) =>
        !!message &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        message.content.length <= 1_000_000,
    )
  )
}

/** 创建无会话持久化的单次模型 SSE 路由。 */
export function createCompletionRoutes(models: ModelService) {
  const routes = new Hono()

  routes.post(
    '/stream',
    bodyLimit({
      maxSize: 2 * 1024 * 1024,
      onError: (c) =>
        c.json({ code: 'REQUEST_TOO_LARGE', message: '请求内容过大。' }, 413),
    }),
    async (c) => {
      const request = await c.req.json<unknown>().catch(() => undefined)
      if (!isRequest(request)) {
        return c.json(
          { code: 'INVALID_COMPLETION_REQUEST', message: '模型请求无效。' },
          400,
        )
      }

      const controller = new AbortController()
      c.req.raw.signal.addEventListener('abort', () => controller.abort(), {
        once: true,
      })
      let events: Awaited<ReturnType<ModelService['stream']>>
      try {
        events = await models.stream(request, controller.signal)
      } catch (error) {
        if (error instanceof ModelServiceError) {
          return c.json(
            { code: error.code, message: error.message },
            error.status,
          )
        }
        return c.json(
          {
            code: 'MODEL_REQUEST_SETUP_FAILED',
            message: '模型调用初始化失败。',
          },
          500,
        )
      }

      return streamSSE(c, async (stream) => {
        stream.onAbort(() => controller.abort())

        const write = (event: CompletionEvent) =>
          stream.writeSSE({ data: JSON.stringify(event), event: event.type })

        try {
          for await (const event of events) {
            if (event.type === 'start') await write({ type: 'start' })
            else if (event.type === 'text_delta') {
              await write({ delta: event.delta, type: 'text_delta' })
            } else if (event.type === 'thinking_delta') {
              await write({ delta: event.delta, type: 'reasoning_delta' })
            } else if (event.type === 'done') {
              const usage = event.message.usage
              await write({
                input: usage.input,
                output: usage.output,
                total: usage.totalTokens,
                type: 'usage',
              })
              await write({ stopReason: event.reason, type: 'done' })
            } else if (event.type === 'error') {
              await write({
                code: 'MODEL_REQUEST_FAILED',
                message: '模型调用失败。',
                type: 'error',
              })
            }
          }
        } catch {
          if (!controller.signal.aborted) {
            await write({
              code: 'MODEL_REQUEST_FAILED',
              message: '模型调用失败。',
              type: 'error',
            })
          }
        }
      })
    },
  )

  return routes
}
