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
  parts?: AgentSessionMessagePartVo[]
  reasoning?: string
  role: 'assistant' | 'user'
  seq: number
  stopReason?: string
  timestamp: number
  tools?: AgentSessionToolVo[]
}

export interface AgentSessionToolVo {
  errorText?: string
  input: Record<string, unknown>
  kind: 'edit' | 'read'
  output?: string
  state: 'input-available' | 'output-available' | 'output-error'
  toolCallId: string
  toolName: string
}

export type AgentSessionMessagePartVo =
  | { reasoning: string; type: 'reasoning' }
  | { text: string; type: 'text' }
  | { tool: AgentSessionToolVo; type: 'tool' }

export interface AgentSessionMessagePageVo {
  items: AgentSessionMessageVo[]
  nextCursor: number | null
}

export type AgentRunEventVo =
  | { sessionId: string; type: 'start' }
  | { delta: string; type: 'text_delta' | 'reasoning_delta' }
  | {
      input: unknown
      toolCallId: string
      toolName: string
      type: 'tool_start'
    }
  | {
      isError: boolean
      output: unknown
      toolCallId: string
      toolName: string
      type: 'tool_end'
    }
  | {
      approvalId: string
      kind: 'edit' | 'read'
      path: string
      title: string
      toolCallId: string
      toolName: 'edit' | 'read' | 'write'
      type: 'tool_approval_required'
    }
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

export interface PendingToolApprovalVo {
  approvalId: string
  kind: 'edit' | 'read'
  path: string
  title: string
  toolCallId: string
  toolName: 'edit' | 'read' | 'write'
}
