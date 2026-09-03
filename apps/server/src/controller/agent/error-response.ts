import { AgentRuntimeError } from '@oh-my-harness/agent-runtime'
import { ModelServiceError } from '@oh-my-harness/llm'
import type { Context } from 'hono'

/** 将核心错误映射为不泄露内部状态的 HTTP 响应。 */
export function agentErrorResponse(context: Context, error: unknown) {
  if (
    error instanceof AgentRuntimeError ||
    error instanceof ModelServiceError
  ) {
    return context.json(
      { code: error.code, message: error.message },
      error.status,
    )
  }
  return context.json(
    { code: 'AGENT_REQUEST_FAILED', message: 'Agent 请求处理失败。' },
    500,
  )
}
