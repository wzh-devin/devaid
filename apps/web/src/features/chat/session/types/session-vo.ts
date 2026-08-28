export interface AgentSessionVo {
  createdAt: number
  id: string
  modelId: string
  name: null | string
  providerId: string
  workspaceId: null | string
}

export interface AgentSessionMessageVo {
  content: string
  entryId: string
  reasoning?: string
  role: 'assistant' | 'user'
  seq: number
  stopReason?: string
  timestamp: number
}

export interface AgentSessionMessagePageVo {
  items: AgentSessionMessageVo[]
  nextCursor: number | null
}

export type AgentRunEventVo =
  | { sessionId: string; type: 'start' }
  | { delta: string; type: 'text_delta' | 'reasoning_delta' }
  | {
      cacheRead: number
      cacheWrite: number
      input: number
      output: number
      total: number
      type: 'usage'
    }
  | { entryId: string; stopReason: string; type: 'done' }
  | { code: string; message: string; type: 'error' }
