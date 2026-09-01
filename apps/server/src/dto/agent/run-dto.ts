import type { ToolPermission } from '@devaid/agent-policy'
import type { AgentRunAttachment } from '@devaid/agent-runtime'

export interface SendAgentMessageDto {
  attachments?: readonly AgentRunAttachment[]
  commandId?: string
  content: string
  permission: ToolPermission
  skillIds?: readonly string[]
}

export type AgentRunEventDto =
  | { sessionId: string; type: 'start' }
  | { delta: string; type: 'text_delta' }
  | { delta: string; type: 'reasoning_delta' }
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
  | {
      entryId: string
      stopReason: string
      type: 'done'
    }
  | { code: string; message: string; type: 'error' }
