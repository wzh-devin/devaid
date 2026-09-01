export interface AgentRunAttachment {
  content: string
  kind: 'image' | 'text'
  mimeType: string
  name: string
  size: number
}

export interface AgentRunInput {
  attachments?: readonly AgentRunAttachment[]
  commandId?: string
  content: string
  skillIds?: readonly string[]
}

export interface AgentMessageAttachment {
  contentIndex: number
  id: string
  mimeType: string
  name: string
  size: number
}

export interface AgentMessageContextItem {
  description: string
  id: string
  kind: 'command' | 'skill'
  label: string
  reference: string
  sourceId: string
}
