import type { AgentRun, AgentRuntime } from '@devaid/agent-runtime'
import type { Context } from 'hono'
import { streamSSE } from 'hono/streaming'

import type {
  AgentRunEventDto,
  SendAgentMessageDto,
} from '../../dto/agent/run-dto.ts'
import { agentErrorResponse } from './error-response.ts'

function parseMessage(value: unknown): SendAgentMessageDto | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const record = value as Record<string, unknown>
  if (
    Object.keys(record).some((key) => key !== 'content') ||
    typeof record.content !== 'string' ||
    !record.content.trim() ||
    record.content.length > 1_000_000
  ) {
    return undefined
  }
  return { content: record.content }
}

function streamRun(context: Context, run: AgentRun) {
  return streamSSE(context, async (stream) => {
    stream.onAbort(run.detach)
    try {
      for await (const event of run.events) {
        const dto = event satisfies AgentRunEventDto
        await stream.writeSSE({ data: JSON.stringify(dto), event: dto.type })
      }
    } catch {
      run.detach()
    }
  })
}

/** 创建 Agent prompt、continue 与 abort Controller。 */
export function createAgentRunController(runtime: AgentRuntime) {
  return {
    abort: (context: Context) => {
      try {
        runtime.abort(context.req.param('id')!)
        return context.body(null, 204)
      } catch (error) {
        return agentErrorResponse(context, error)
      }
    },
    continue: async (context: Context) => {
      try {
        return streamRun(
          context,
          await runtime.continue(context.req.param('id')!),
        )
      } catch (error) {
        return agentErrorResponse(context, error)
      }
    },
    prompt: async (context: Context) => {
      const input = parseMessage(
        await context.req.json<unknown>().catch(() => undefined),
      )
      if (!input) {
        return context.json(
          { code: 'INVALID_SESSION_REQUEST', message: '消息内容无效。' },
          400,
        )
      }
      try {
        return streamRun(
          context,
          await runtime.prompt(context.req.param('id')!, input.content),
        )
      } catch (error) {
        return agentErrorResponse(context, error)
      }
    },
  }
}
