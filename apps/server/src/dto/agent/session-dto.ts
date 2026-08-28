export interface CreateAgentSessionDto {
  modelId: string
  name?: string
  providerId: string
  workspaceId: string
}

export type UpdateAgentSessionDto =
  { name: null | string } | { modelId: string; providerId: string }

export interface AgentSessionDto {
  createdAt: number
  id: string
  modelId: string
  name: null | string
  providerId: string
  workspaceId: null | string
}

export interface AgentSessionDetailDto extends AgentSessionDto {
  stats: {
    cachedTokens: number
    costTotal: number
    messageCount: number
    totalTokens: number
    uncachedTokens: number
  }
}

export interface AgentSessionMessageDto {
  content: string
  entryId: string
  reasoning?: string
  role: 'assistant' | 'user'
  seq: number
  stopReason?: string
  timestamp: number
}

export interface AgentSessionMessagePageDto {
  items: AgentSessionMessageDto[]
  nextCursor: number | null
}
