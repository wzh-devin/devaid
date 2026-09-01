export interface AgentSessionVo {
  createdAt: number
  id: string
  modelId: string
  name: null | string
  providerId: string
  workspaceId: null | string
}

export interface AgentSessionMessageVo {
  attachments?: AgentSessionMessageAttachmentVo[]
  content: string
  contextItems?: AgentSessionMessageContextItemVo[]
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
  kind: 'command' | 'edit' | 'read' | 'skill'
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
      approvalId: string
      input: { args: string[]; program: string }
      kind: 'command'
      title: string
      toolCallId: string
      toolName: 'command'
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

export type PendingToolApprovalVo = Extract<
  AgentRunEventVo,
  { type: 'tool_approval_required' }
>

export interface AgentSessionMessageAttachmentVo {
  id: string
  mimeType: string
  name: string
  size: number
  src?: string
}

export interface AgentSessionMessageContextItemVo {
  description: string
  id: string
  kind: 'command' | 'skill'
  label: string
  reference: string
  sourceId: string
}
