import type {
  AgentRuntime,
  AgentSessionDetail,
  AgentSessionInfo,
  AgentSessionMessagePage,
} from '@devaid/agent-runtime'
import type { Context } from 'hono'

import type {
  AgentSessionDetailDto,
  AgentSessionDto,
  AgentSessionMessagePageDto,
  CreateAgentSessionDto,
  UpdateAgentSessionDto,
} from '../../dto/agent/session-dto.ts'
import type { WorkspaceStore } from '../../infrastructure/workspace/workspace-store.ts'
import { agentErrorResponse } from './error-response.ts'

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every((key) => keys.includes(key))
}

function parseCreateSession(value: unknown): CreateAgentSessionDto | undefined {
  if (
    !isObject(value) ||
    !hasOnlyKeys(value, ['modelId', 'name', 'providerId', 'workspaceId'])
  ) {
    return undefined
  }
  const providerId =
    typeof value.providerId === 'string' ? value.providerId.trim() : ''
  const modelId = typeof value.modelId === 'string' ? value.modelId.trim() : ''
  const name = typeof value.name === 'string' ? value.name.trim() : undefined
  const workspaceId =
    typeof value.workspaceId === 'string' ? value.workspaceId.trim() : ''
  if (
    !providerId ||
    providerId.length > 512 ||
    !modelId ||
    modelId.length > 512 ||
    !workspaceId ||
    workspaceId.length > 200 ||
    (value.name !== undefined && (!name || name.length > 200))
  ) {
    return undefined
  }
  return { modelId, ...(name ? { name } : {}), providerId, workspaceId }
}

function parseUpdateSession(value: unknown): UpdateAgentSessionDto | undefined {
  if (!isObject(value)) return undefined
  if (hasOnlyKeys(value, ['name']) && Object.hasOwn(value, 'name')) {
    if (value.name === null) return { name: null }
    if (typeof value.name !== 'string') return undefined
    const name = value.name.trim()
    return name && name.length <= 200 ? { name } : undefined
  }
  if (
    !hasOnlyKeys(value, ['modelId', 'providerId']) ||
    !Object.hasOwn(value, 'modelId') ||
    !Object.hasOwn(value, 'providerId')
  ) {
    return undefined
  }
  const providerId =
    typeof value.providerId === 'string' ? value.providerId.trim() : ''
  const modelId = typeof value.modelId === 'string' ? value.modelId.trim() : ''
  return providerId &&
    providerId.length <= 512 &&
    modelId &&
    modelId.length <= 512
    ? { modelId, providerId }
    : undefined
}

function parseMessagesQuery(context: Context) {
  const limitSource = context.req.query('limit')
  const beforeSource = context.req.query('before')
  const limit = limitSource === undefined ? 50 : Number(limitSource)
  const before = beforeSource === undefined ? undefined : Number(beforeSource)
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 200 ||
    (before !== undefined && (!Number.isSafeInteger(before) || before < 0))
  ) {
    return undefined
  }
  return { ...(before === undefined ? {} : { before }), limit }
}

function sessionDto(
  session: AgentSessionInfo,
  workspaceId: string | null,
): AgentSessionDto {
  return {
    createdAt: session.createdAt,
    id: session.id,
    modelId: session.modelId,
    name: session.name,
    providerId: session.providerId,
    workspaceId,
  }
}

function sessionDetailDto(
  session: AgentSessionDetail,
  workspaceId: string | null,
): AgentSessionDetailDto {
  return { ...sessionDto(session, workspaceId), stats: session.stats }
}

async function workspaceMap(workspaces: WorkspaceStore) {
  return new Map(
    (await workspaces.list()).map((workspace) => [
      workspace.path,
      workspace.id,
    ]),
  )
}

function messagePageDto(
  sessionId: string,
  page: AgentSessionMessagePage,
): AgentSessionMessagePageDto {
  return {
    ...page,
    items: page.items.map((message) => ({
      ...message,
      attachments: message.attachments?.map(
        ({ contentIndex, ...attachment }) => ({
          ...attachment,
          ...(attachment.mimeType.startsWith('image/')
            ? {
                src: `/api/agent/sessions/${encodeURIComponent(sessionId)}/attachments/${encodeURIComponent(message.entryId)}/${contentIndex}`,
              }
            : {}),
        }),
      ),
    })),
  }
}

/** 创建 Agent Session CRUD 与消息读取 Controller。 */
export function createAgentSessionController(
  runtime: AgentRuntime,
  workspaces: WorkspaceStore,
) {
  return {
    create: async (context: Context) => {
      const input = parseCreateSession(
        await context.req.json<unknown>().catch(() => undefined),
      )
      if (!input) {
        return context.json(
          { code: 'INVALID_SESSION_REQUEST', message: '会话请求无效。' },
          400,
        )
      }
      try {
        const workspace = await workspaces.requireAvailable(input.workspaceId)
        const session = await runtime.createSession({
          cwd: workspace.path,
          modelId: input.modelId,
          ...(input.name ? { name: input.name } : {}),
          providerId: input.providerId,
        })
        return context.json(sessionDto(session, workspace.id), 201)
      } catch (error) {
        return agentErrorResponse(context, error)
      }
    },
    delete: async (context: Context) => {
      try {
        await runtime.deleteSession(context.req.param('id')!)
        return context.body(null, 204)
      } catch (error) {
        return agentErrorResponse(context, error)
      }
    },
    get: async (context: Context) => {
      try {
        const session = await runtime.getSession(context.req.param('id')!)
        const ids = await workspaceMap(workspaces)
        return context.json(
          sessionDetailDto(session, ids.get(session.cwd) ?? null),
        )
      } catch (error) {
        return agentErrorResponse(context, error)
      }
    },
    list: async (context: Context) => {
      try {
        const [sessions, ids] = await Promise.all([
          runtime.listSessions(),
          workspaceMap(workspaces),
        ])
        return context.json(
          sessions.map((session) =>
            sessionDto(session, ids.get(session.cwd) ?? null),
          ) satisfies AgentSessionDto[],
        )
      } catch (error) {
        return agentErrorResponse(context, error)
      }
    },
    messages: async (context: Context) => {
      const query = parseMessagesQuery(context)
      if (!query) {
        return context.json(
          { code: 'INVALID_SESSION_REQUEST', message: '分页参数无效。' },
          400,
        )
      }
      try {
        const sessionId = context.req.param('id')!
        return context.json(
          messagePageDto(
            sessionId,
            await runtime.getMessages(sessionId, query),
          ),
        )
      } catch (error) {
        return agentErrorResponse(context, error)
      }
    },
    attachment: async (context: Context) => {
      const contentIndex = Number(context.req.param('contentIndex'))
      try {
        const attachment = await runtime.getAttachment(
          context.req.param('id')!,
          context.req.param('entryId')!,
          contentIndex,
        )
        const data = Buffer.from(attachment.data, 'base64')
        return context.body(data, 200, {
          'cache-control': 'private, no-store',
          'content-length': String(data.byteLength),
          'content-type': attachment.mimeType,
          'x-content-type-options': 'nosniff',
        })
      } catch (error) {
        return agentErrorResponse(context, error)
      }
    },
    update: async (context: Context) => {
      const input = parseUpdateSession(
        await context.req.json<unknown>().catch(() => undefined),
      )
      if (!input) {
        return context.json(
          { code: 'INVALID_SESSION_REQUEST', message: '会话更新请求无效。' },
          400,
        )
      }
      try {
        const session =
          'name' in input
            ? await runtime.renameSession(
                context.req.param('id')!,
                input.name ?? undefined,
              )
            : await runtime.updateSessionModel(context.req.param('id')!, input)
        const ids = await workspaceMap(workspaces)
        return context.json(sessionDto(session, ids.get(session.cwd) ?? null))
      } catch (error) {
        return agentErrorResponse(context, error)
      }
    },
  }
}
