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
  attachments?: AgentSessionMessageAttachmentDto[]
  content: string
  contextItems?: AgentSessionMessageContextItemDto[]
  entryId: string
  parts?: AgentSessionMessagePartDto[]
  reasoning?: string
  role: 'assistant' | 'user'
  seq: number
  stopReason?: string
  timestamp: number
  tools?: AgentSessionToolDto[]
}

export interface AgentSessionToolDto {
  errorText?: string
  input: Record<string, unknown>
  kind: 'command' | 'edit' | 'read' | 'skill'
  outcome?: {
    exitCode: number | null
    outputExceeded: boolean
    signal: string | null
    timedOut: boolean
  }
  output?: string
  state: 'input-available' | 'output-available' | 'output-error'
  toolCallId: string
  toolName: string
}

export type AgentSessionMessagePartDto =
  | { reasoning: string; type: 'reasoning' }
  | { text: string; type: 'text' }
  | { tool: AgentSessionToolDto; type: 'tool' }

export interface AgentSessionMessagePageDto {
  items: AgentSessionMessageDto[]
  nextCursor: number | null
}

export interface AgentSessionMessageAttachmentDto {
  id: string
  mimeType: string
  name: string
  size: number
  src?: string
}

export interface AgentSessionMessageContextItemDto {
  description: string
  id: string
  kind: 'command' | 'skill'
  label: string
  reference: string
  sourceId: string
}
