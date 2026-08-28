export interface SendAgentMessageDto {
  content: string
}

export type AgentRunEventDto =
  | { sessionId: string; type: 'start' }
  | { delta: string; type: 'text_delta' }
  | { delta: string; type: 'reasoning_delta' }
  | {
      cacheRead: number
      cacheWrite: number
      input: number
      output: number
      total: number
      type: 'usage'
    }
  | {
      entryId: string
      stopReason: string
      type: 'done'
    }
  | { code: string; message: string; type: 'error' }
