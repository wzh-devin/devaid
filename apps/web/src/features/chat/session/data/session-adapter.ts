import type { ChatMessage, ChatThread } from '../../data/index.ts'
import type { AgentSessionMessageVo, AgentSessionVo } from '../types/index.ts'

const SESSION_USER = {
  avatar: '',
  email: '',
  name: '你',
} as const

const toTimestamp = (value: number) => (value < 1e12 ? value * 1000 : value)

const formatSessionTime = (value: number) =>
  new Intl.DateTimeFormat('zh-CN', {
    day: 'numeric',
    month: 'numeric',
  }).format(toTimestamp(value))

export const toChatMessage = (message: AgentSessionMessageVo): ChatMessage => ({
  actions: message.role === 'assistant' ? 'full' : undefined,
  id: message.entryId,
  reasoning: message.reasoning
    ? {
        steps: [{ content: message.reasoning, label: '思考过程' }],
      }
    : undefined,
  role: message.role,
  status: message.role === 'assistant' ? 'complete' : undefined,
  text: message.content,
})

export const toChatThread = (session: AgentSessionVo): ChatThread => ({
  id: session.id,
  messages: [],
  modelId: session.modelId,
  preview: session.modelId,
  providerId: session.providerId,
  searchModeId: '',
  title: session.name ?? '新对话',
  updatedAt: formatSessionTime(session.createdAt),
  workspaceId: session.workspaceId,
  user: SESSION_USER,
})

export const createPendingChatThread = (sessionId: string): ChatThread => ({
  id: sessionId,
  messages: [],
  modelId: '',
  preview: '',
  searchModeId: '',
  title: '会话',
  updatedAt: '',
  workspaceId: null,
  user: SESSION_USER,
})
