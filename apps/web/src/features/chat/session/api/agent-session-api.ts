import type {
  AgentRunEventVo,
  AgentSessionMessagePageVo,
  AgentSessionVo,
} from '../types/index.ts'

interface CreateAgentSessionInput {
  modelId: string
  name?: string
  providerId: string
  workspaceId: string
}

interface UpdateAgentSessionModelInput {
  modelId: string
  providerId: string
}

interface ParsedSseFrames {
  events: AgentRunEventVo[]
  remainder: string
}

export class AgentSessionApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code: string, status = 0) {
    super(message)
    this.name = 'AgentSessionApiError'
    this.code = code
    this.status = status
  }
}

const sessionPath = (sessionId: string) =>
  `/api/agent/sessions/${encodeURIComponent(sessionId)}`

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as
      { code?: string; message?: string } | undefined
    throw new AgentSessionApiError(
      body?.message ?? `请求失败（${response.status}）`,
      body?.code ?? 'AGENT_REQUEST_FAILED',
      response.status,
    )
  }
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T)
}

function toRunEvent(value: unknown): AgentRunEventVo {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AgentSessionApiError(
      'Agent 返回了无效的流式事件。',
      'INVALID_STREAM_RESPONSE',
    )
  }

  const event = value as Record<string, unknown>
  switch (event.type) {
    case 'start':
      if (typeof event.sessionId === 'string') {
        return { sessionId: event.sessionId, type: 'start' }
      }
      break
    case 'text_delta':
    case 'reasoning_delta':
      if (typeof event.delta === 'string') {
        return { delta: event.delta, type: event.type }
      }
      break
    case 'usage':
      if (
        ['cacheRead', 'cacheWrite', 'input', 'output', 'total'].every(
          (key) => typeof event[key] === 'number',
        )
      ) {
        return {
          cacheRead: event.cacheRead as number,
          cacheWrite: event.cacheWrite as number,
          input: event.input as number,
          output: event.output as number,
          total: event.total as number,
          type: 'usage',
        }
      }
      break
    case 'done':
      if (
        typeof event.entryId === 'string' &&
        typeof event.stopReason === 'string'
      ) {
        return {
          entryId: event.entryId,
          stopReason: event.stopReason,
          type: 'done',
        }
      }
      break
    case 'error':
      if (typeof event.code === 'string' && typeof event.message === 'string') {
        return { code: event.code, message: event.message, type: 'error' }
      }
      break
  }

  throw new AgentSessionApiError(
    'Agent 返回了无效的流式事件。',
    'INVALID_STREAM_RESPONSE',
  )
}

/** 解析完整 SSE frame，并保留可能跨网络 chunk 的尾部半包。 */
export function parseAgentSseFrames(source: string): ParsedSseFrames {
  const events: AgentRunEventVo[] = []
  let remainder = source
  let boundary = remainder.match(/\r?\n\r?\n/u)

  while (boundary?.index !== undefined) {
    const frame = remainder.slice(0, boundary.index)
    remainder = remainder.slice(boundary.index + boundary[0].length)
    const data = frame
      .split(/\r?\n/u)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')

    if (data) {
      try {
        events.push(toRunEvent(JSON.parse(data)))
      } catch (error) {
        if (error instanceof AgentSessionApiError) throw error
        throw new AgentSessionApiError(
          'Agent 返回了无法解析的流式事件。',
          'INVALID_STREAM_RESPONSE',
        )
      }
    }
    boundary = remainder.match(/\r?\n\r?\n/u)
  }

  return { events, remainder }
}

export const listAgentSessions = () =>
  request<AgentSessionVo[]>('/api/agent/sessions')

export const getAgentSession = (sessionId: string) =>
  request<AgentSessionVo>(sessionPath(sessionId))

export const createAgentSession = (input: CreateAgentSessionInput) =>
  request<AgentSessionVo>('/api/agent/sessions', {
    body: JSON.stringify(input),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

export const updateAgentSessionModel = (
  sessionId: string,
  input: UpdateAgentSessionModelInput,
) =>
  request<AgentSessionVo>(sessionPath(sessionId), {
    body: JSON.stringify(input),
    headers: { 'content-type': 'application/json' },
    method: 'PATCH',
  })

export const listAgentSessionMessages = (
  sessionId: string,
  before?: number,
) => {
  const query = new URLSearchParams({ limit: '200' })
  if (before !== undefined) query.set('before', String(before))
  return request<AgentSessionMessagePageVo>(
    `${sessionPath(sessionId)}/messages?${query}`,
  )
}

export const abortAgentSession = (sessionId: string) =>
  request<void>(`${sessionPath(sessionId)}/abort`, { method: 'POST' })

/** 消费 POST SSE；EventSource 不支持 POST，因此直接使用浏览器流。 */
export async function streamAgentMessage(
  sessionId: string,
  content: string,
  onEvent: (event: AgentRunEventVo) => void,
) {
  const response = await fetch(`${sessionPath(sessionId)}/messages/stream`, {
    body: JSON.stringify({ content }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as
      { code?: string; message?: string } | undefined
    throw new AgentSessionApiError(
      body?.message ?? `请求失败（${response.status}）`,
      body?.code ?? 'AGENT_REQUEST_FAILED',
      response.status,
    )
  }
  if (!response.body) {
    throw new AgentSessionApiError(
      '浏览器没有收到 Agent 响应流。',
      'STREAM_UNAVAILABLE',
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let remainder = ''
  while (true) {
    const { done, value } = await reader.read()
    remainder += decoder.decode(value, { stream: !done })
    const parsed = parseAgentSseFrames(remainder)
    remainder = parsed.remainder
    parsed.events.forEach(onEvent)
    if (done) break
  }
  if (remainder.trim()) {
    parseAgentSseFrames(`${remainder}\n\n`).events.forEach(onEvent)
  }
}
