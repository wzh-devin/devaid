import { isAbsolute } from 'node:path'

import type {
  Entry,
  JsonValue,
  Session,
  SessionCreateOptions,
  SessionMetadata,
  SessionRepo,
  SessionStats,
} from '@earendil-works/pi-agent-core'
import { SessionError } from '@earendil-works/pi-agent-core'
import type {
  AssistantMessage,
  ToolResultMessage,
  UserMessage,
} from '@earendil-works/pi-ai'

import { AgentRuntimeError } from '../error/agent-runtime-error.ts'
import { structuredMessageDetails } from '../execution/attachment-message.ts'
import type {
  AgentMessageAttachment,
  AgentMessageContextItem,
} from '../execution/run-input.ts'

export interface AgentSessionModelConfig {
  modelId: string
  providerId: string
  schemaVersion: 1
}

export interface AgentSessionMetadata extends SessionMetadata {
  cwd: string
  metadata?: Record<string, JsonValue>
  path: string
}

export interface AgentSessionCreateOptions extends SessionCreateOptions {
  cwd: string
  metadata?: Record<string, JsonValue>
}

export interface AgentSessionListOptions {
  cwd?: string
}

export type AgentSessionRepository = SessionRepo<
  AgentSessionMetadata,
  AgentSessionCreateOptions,
  AgentSessionListOptions
>

export interface AgentSessionInfo {
  createdAt: number
  cwd: string
  id: string
  modelId: string
  name: string | null
  providerId: string
}

/** 可失败、可重建的 Session 查询投影；JSONL 仍是唯一事实源。 */
export interface AgentSessionProjection {
  changed(id: string): Promise<void>
  deleted(id: string): Promise<void>
  list(): Promise<AgentSessionInfo[]>
}

export interface AgentSessionDetail extends AgentSessionInfo {
  stats: SessionStats
}

export interface AgentSessionMessage {
  attachments?: AgentMessageAttachment[]
  content: string
  contextItems?: AgentMessageContextItem[]
  entryId: string
  parts?: AgentSessionMessagePart[]
  reasoning?: string
  role: 'assistant' | 'user'
  seq: number
  stopReason?: string
  timestamp: number
  tools?: AgentSessionTool[]
}

export interface AgentSessionTool {
  errorText?: string
  input: Record<string, unknown>
  kind: 'command' | 'edit' | 'read' | 'skill'
  output?: string
  state: 'input-available' | 'output-available' | 'output-error'
  toolCallId: string
  toolName: string
}

export type AgentSessionMessagePart =
  | { reasoning: string; type: 'reasoning' }
  | { text: string; type: 'text' }
  | { tool: AgentSessionTool; type: 'tool' }

export interface AgentSessionMessagePage {
  items: AgentSessionMessage[]
  nextCursor: number | null
}

export interface OpenAgentSession {
  config: AgentSessionModelConfig
  entries: Entry[]
  metadata: AgentSessionMetadata
  session: Session<AgentSessionMetadata>
}

const sessionIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function readHeaderConfig(
  metadata: AgentSessionMetadata,
): AgentSessionModelConfig {
  const value = metadata.metadata
  if (
    !value ||
    value.schemaVersion !== 1 ||
    typeof value.providerId !== 'string' ||
    typeof value.modelId !== 'string'
  ) {
    throw new AgentRuntimeError(
      'SESSION_METADATA_INVALID',
      '会话元数据无效。',
      500,
    )
  }
  return {
    modelId: value.modelId,
    providerId: value.providerId,
    schemaVersion: 1,
  }
}

function configFromModelChange(
  entry: Entry | undefined,
  fallback: AgentSessionModelConfig,
) {
  return entry?.type === 'model_change'
    ? {
        modelId: entry.modelId,
        providerId: entry.provider,
        schemaVersion: 1 as const,
      }
    : fallback
}

function toInfo(
  metadata: AgentSessionMetadata,
  config: AgentSessionModelConfig,
  name: string | undefined,
): AgentSessionInfo {
  return {
    createdAt: metadata.createdAt,
    cwd: metadata.cwd,
    id: metadata.id,
    modelId: config.modelId,
    name: name ?? null,
    providerId: config.providerId,
  }
}

function messageText(message: AssistantMessage | UserMessage) {
  if (message.role === 'user') {
    return typeof message.content === 'string'
      ? message.content
      : message.content
          .filter((content) => content.type === 'text')
          .map((content) => content.text)
          .join('')
  }
  return message.content
    .filter((content) => content.type === 'text')
    .map((content) => content.text)
    .join('')
}

function toolResultText(message: ToolResultMessage) {
  return message.content
    .filter((content) => content.type === 'text')
    .map((content) => content.text)
    .join('')
}

function safeToolInput(input: Record<string, unknown>) {
  const attachmentId =
    typeof input.attachmentId === 'string' ? input.attachmentId : undefined
  if (attachmentId !== undefined) {
    return attachmentId && !attachmentId.includes('\0')
      ? { attachmentId }
      : { attachmentId: '[blocked id]' }
  }
  if (
    typeof input.program === 'string' &&
    input.program.length > 0 &&
    input.program.length <= 255 &&
    !input.program.includes('\0') &&
    Array.isArray(input.args) &&
    input.args.length <= 128 &&
    input.args.every(
      (argument) => typeof argument === 'string' && !argument.includes('\0'),
    )
  ) {
    return { args: [...input.args], program: input.program }
  }
  const path = typeof input.path === 'string' ? input.path : undefined
  if (
    path === undefined ||
    path.includes('\0') ||
    path.split(/[\\/]/u).includes('..') ||
    isAbsolute(path) ||
    path === '~' ||
    path.startsWith('~/') ||
    path.startsWith('file:')
  ) {
    return path === undefined ? {} : { path: '[blocked path]' }
  }
  return { path }
}

function toSessionTool(
  toolCall: Extract<AssistantMessage['content'][number], { type: 'toolCall' }>,
  toolResults: ReadonlyMap<string, ToolResultMessage>,
): AgentSessionTool {
  const result = toolResults.get(toolCall.id)
  const output = result ? toolResultText(result) : undefined
  return {
    ...(result?.isError && output ? { errorText: output } : {}),
    input: safeToolInput(toolCall.arguments),
    kind:
      toolCall.name === 'command'
        ? 'command'
        : toolCall.name === 'read'
          ? 'read'
          : toolCall.name === 'load_skill_resource'
            ? 'skill'
            : toolCall.name === 'view_attachment'
              ? 'read'
              : 'edit',
    ...(!result?.isError && output ? { output } : {}),
    state: result
      ? result.isError
        ? 'output-error'
        : 'output-available'
      : 'input-available',
    toolCallId: toolCall.id,
    toolName: toolCall.name,
  }
}

function toMessage(
  entry: Extract<Entry, { type: 'message' }>,
  toolResults: ReadonlyMap<string, ToolResultMessage>,
) {
  const { message } = entry
  if (message.role === 'custom' && message.customType === 'devaid_user_input') {
    const details = structuredMessageDetails(message.details)
    if (!details) return undefined
    return {
      attachments: details.attachments.map(
        ({ content: _content, kind: _kind, ...attachment }) => attachment,
      ),
      content: details.content,
      contextItems: details.contextItems,
      entryId: entry.id,
      role: 'user' as const,
      seq: entry.seq,
      timestamp: message.timestamp,
    } satisfies AgentSessionMessage
  }
  if (message.role !== 'user' && message.role !== 'assistant') return undefined
  const parts: AgentSessionMessagePart[] =
    message.role === 'assistant'
      ? message.content.flatMap<AgentSessionMessagePart>((content) => {
          if (content.type === 'text') {
            return content.text ? [{ text: content.text, type: 'text' }] : []
          }
          if (content.type === 'thinking') {
            return content.thinking
              ? [{ reasoning: content.thinking, type: 'reasoning' }]
              : []
          }
          return [
            {
              tool: toSessionTool(content, toolResults),
              type: 'tool',
            },
          ]
        })
      : []
  const reasoning =
    message.role === 'assistant'
      ? message.content
          .filter((content) => content.type === 'thinking')
          .map((content) => content.thinking)
          .join('')
      : ''
  const tools =
    message.role === 'assistant'
      ? parts.flatMap((part) => (part.type === 'tool' ? [part.tool] : []))
      : []
  return {
    content: messageText(message),
    entryId: entry.id,
    ...(parts.length ? { parts } : {}),
    ...(reasoning ? { reasoning } : {}),
    role: message.role,
    seq: entry.seq,
    ...(message.role === 'assistant' ? { stopReason: message.stopReason } : {}),
    timestamp: message.timestamp,
    ...(tools.length ? { tools } : {}),
  } satisfies AgentSessionMessage
}

function sessionFailure(error: unknown): never {
  if (error instanceof AgentRuntimeError) throw error
  if (error instanceof SessionError && error.code === 'not_found') {
    throw new AgentRuntimeError('SESSION_NOT_FOUND', '会话不存在。', 404)
  }
  throw new AgentRuntimeError(
    'SESSION_PERSISTENCE_FAILED',
    '会话持久化操作失败。',
    500,
  )
}

/** 在 Pi SessionRepo 上提供当前主分支的最小会话能力。 */
export class AgentSessionService {
  private readonly projection?: AgentSessionProjection
  private readonly repository: AgentSessionRepository
  private listCache?: AgentSessionInfo[]
  private metadataIndex?: Promise<Map<string, AgentSessionMetadata>>

  constructor(
    repository: AgentSessionRepository,
    projection?: AgentSessionProjection,
  ) {
    this.repository = repository
    this.projection = projection
  }

  async create(input: {
    cwd: string
    modelId: string
    name?: string
    providerId: string
  }) {
    let session: Session<AgentSessionMetadata> | undefined
    try {
      const config: AgentSessionModelConfig = {
        modelId: input.modelId,
        providerId: input.providerId,
        schemaVersion: 1,
      }
      session = await this.repository.create({
        cwd: input.cwd,
        metadata: { ...config },
      })
      if (input.name !== undefined) await session.setName(input.name)
      const metadata = await session.getMetadata()
      if (this.metadataIndex) {
        ;(await this.metadataIndex).set(metadata.id, metadata)
      }
      const info = toInfo(metadata, config, input.name)
      this.updateListCache(info)
      await this.projectChanged(info.id)
      return info
    } catch (error) {
      if (session) {
        const metadata = await session.getMetadata().catch(() => undefined)
        if (metadata)
          await this.repository.delete(metadata).catch(() => undefined)
      }
      return sessionFailure(error)
    }
  }

  async list() {
    try {
      if (this.projection) {
        try {
          return await this.projection.list()
        } catch {
          return await this.listFromRepository(false)
        }
      }
      return await this.listFromRepository(true)
    } catch (error) {
      return sessionFailure(error)
    }
  }

  private async listFromRepository(cache: boolean) {
    if (cache && this.listCache) return this.listCache
    const sessions: AgentSessionInfo[] = []
    for (const metadata of (await this.getMetadataIndex()).values()) {
      const session = await this.repository.open(metadata)
      const [name, modelChange] = await Promise.all([
        session.getName(),
        session.findEntryOnBranch({
          order: 'newestFirst',
          type: 'model_change',
        }),
      ])
      sessions.push(
        toInfo(
          metadata,
          configFromModelChange(modelChange, readHeaderConfig(metadata)),
          name,
        ),
      )
    }
    sessions.sort((left, right) => right.createdAt - left.createdAt)
    if (cache) this.listCache = sessions
    return sessions
  }

  changed(id: string) {
    this.projectChanged(id)
  }

  private projectChanged(id: string) {
    void this.projection?.changed(id).catch(() => {
      // 投影失败不得回滚已成功的 JSONL mutation。
    })
  }

  private projectDeleted(id: string) {
    void this.projection?.deleted(id).catch(() => {
      // 启动对账会从 JSONL 缺失事实中补偿删除。
    })
  }

  async get(id: string): Promise<AgentSessionDetail> {
    const opened = await this.openSession(id)
    try {
      const [name, stats] = await Promise.all([
        opened.session.getName(),
        opened.session.getStats(),
      ])
      return {
        ...toInfo(opened.metadata, opened.config, name),
        stats,
      }
    } catch (error) {
      return sessionFailure(error)
    }
  }

  async rename(id: string, name: string | undefined) {
    const opened = await this.openSession(id)
    try {
      await opened.session.setName(name)
      const info = toInfo(opened.metadata, opened.config, name)
      this.updateListCache(info)
      await this.projectChanged(id)
      return info
    } catch (error) {
      return sessionFailure(error)
    }
  }

  async updateModel(
    id: string,
    input: { modelId: string; providerId: string },
  ) {
    const opened = await this.openSession(id)
    const config: AgentSessionModelConfig = { ...input, schemaVersion: 1 }
    try {
      await opened.session.appendEntry(
        {
          id: opened.session.idGenerator.next(),
          modelId: input.modelId,
          provider: input.providerId,
          type: 'model_change',
        },
        'main',
      )
      const info = toInfo(
        opened.metadata,
        config,
        await opened.session.getName(),
      )
      this.updateListCache(info)
      await this.projectChanged(id)
      return info
    } catch (error) {
      return sessionFailure(error)
    }
  }

  async messages(
    id: string,
    options: { before?: number; limit: number },
  ): Promise<AgentSessionMessagePage> {
    const opened = await this.openSession(id)
    try {
      // ponytail: 首版主分支分页在内存中过滤；100k entries 压测不达标时改用上游 before-cursor/index。
      const entries = await opened.session.findEntriesOnBranch({
        order: 'newestFirst',
        type: 'message',
      })
      const toolResults = new Map(
        entries.flatMap((entry) => {
          if (entry.type !== 'message' || entry.message.role !== 'toolResult') {
            return []
          }
          return [[entry.message.toolCallId, entry.message] as const]
        }),
      )
      const candidates = entries
        .filter(
          (entry) =>
            entry.type === 'message' &&
            (options.before === undefined || entry.seq < options.before),
        )
        .map((entry) =>
          toMessage(entry as Extract<Entry, { type: 'message' }>, toolResults),
        )
        .filter((message) => message !== undefined)
      const selected = candidates.slice(0, options.limit)
      return {
        items: selected.toReversed(),
        nextCursor:
          candidates.length > options.limit
            ? (selected.at(-1)?.seq ?? null)
            : null,
      }
    } catch (error) {
      return sessionFailure(error)
    }
  }

  async attachment(id: string, entryId: string, contentIndex: number) {
    if (!Number.isSafeInteger(contentIndex) || contentIndex < 0) {
      throw new AgentRuntimeError(
        'INVALID_SESSION_REQUEST',
        '附件参数无效。',
        400,
      )
    }
    const opened = await this.openSession(id)
    try {
      const entry = (
        await opened.session.findEntriesOnBranch({ order: 'oldestFirst' })
      ).find((candidate) => candidate.id === entryId)
      if (
        entry?.type !== 'message' ||
        entry.message.role !== 'custom' ||
        entry.message.customType !== 'devaid_user_input' ||
        !Array.isArray(entry.message.content)
      ) {
        throw new AgentRuntimeError('ATTACHMENT_NOT_FOUND', '附件不存在。', 404)
      }
      const details = structuredMessageDetails(entry.message.details)
      const attachment = details?.attachments.find(
        (candidate) => candidate.contentIndex === contentIndex,
      )
      const legacyContent = entry.message.content[contentIndex]
      const image =
        details?.schemaVersion === 2 &&
        attachment?.kind === 'image' &&
        attachment.content !== undefined
          ? {
              data: attachment.content,
              mimeType: attachment.mimeType,
            }
          : legacyContent?.type === 'image'
            ? legacyContent
            : undefined
      if (!attachment || !image) {
        throw new AgentRuntimeError('ATTACHMENT_NOT_FOUND', '附件不存在。', 404)
      }
      return {
        data: image.data,
        mimeType: image.mimeType,
        name: attachment.name,
      }
    } catch (error) {
      return sessionFailure(error)
    }
  }

  async open(id: string): Promise<OpenAgentSession> {
    const opened = await this.openSession(id)
    try {
      const entries = await opened.session.findEntriesOnBranch({
        order: 'oldestFirst',
      })
      return { ...opened, entries }
    } catch (error) {
      return sessionFailure(error)
    }
  }

  async delete(id: string) {
    try {
      const metadata = await this.findMetadata(id)
      await this.repository.delete(metadata)
      if (this.metadataIndex) (await this.metadataIndex).delete(metadata.id)
      if (this.listCache) {
        this.listCache = this.listCache.filter((session) => session.id !== id)
      }
      await this.projectDeleted(id)
    } catch (error) {
      return sessionFailure(error)
    }
  }

  private async openSession(id: string) {
    try {
      const metadata = await this.findMetadata(id)
      const session = await this.repository.open(metadata)
      const modelChange = await session.findEntryOnBranch({
        order: 'newestFirst',
        type: 'model_change',
      })
      return {
        config: configFromModelChange(modelChange, readHeaderConfig(metadata)),
        metadata,
        session,
      }
    } catch (error) {
      return sessionFailure(error)
    }
  }

  private updateListCache(info: AgentSessionInfo) {
    if (!this.listCache) return
    const index = this.listCache.findIndex((session) => session.id === info.id)
    if (index === -1) {
      this.listCache.unshift(info)
      return
    }
    this.listCache[index] = info
  }

  private async findMetadata(id: string) {
    if (!sessionIdPattern.test(id)) {
      throw new AgentRuntimeError(
        'INVALID_SESSION_REQUEST',
        'Session ID 无效。',
        400,
      )
    }
    const hadIndex = this.metadataIndex !== undefined
    let metadata = (await this.getMetadataIndex()).get(id)
    if (!metadata && hadIndex) {
      metadata = (await this.refreshMetadataIndex()).get(id)
    }
    if (!metadata) {
      throw new AgentRuntimeError('SESSION_NOT_FOUND', '会话不存在。', 404)
    }
    return metadata
  }

  private async getMetadataIndex() {
    return this.metadataIndex ?? this.refreshMetadataIndex()
  }

  private async refreshMetadataIndex() {
    // ponytail: 单进程缓存适合本地 Server；多进程写入时改为仓储版本号或变更通知。
    const loading = this.repository
      .list()
      .then(
        (sessions) => new Map(sessions.map((session) => [session.id, session])),
      )
    this.metadataIndex = loading
    this.listCache = undefined
    try {
      return await loading
    } catch (error) {
      if (this.metadataIndex === loading) this.metadataIndex = undefined
      throw error
    }
  }
}
