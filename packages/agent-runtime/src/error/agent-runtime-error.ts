export type AgentRuntimeErrorStatus = 400 | 404 | 409 | 413 | 500

/** 可安全映射到 HTTP/SSE 的 Agent Runtime 领域错误。 */
export class AgentRuntimeError extends Error {
  readonly code: string
  readonly status: AgentRuntimeErrorStatus

  constructor(code: string, message: string, status: AgentRuntimeErrorStatus) {
    super(message)
    this.code = code
    this.status = status
  }
}
