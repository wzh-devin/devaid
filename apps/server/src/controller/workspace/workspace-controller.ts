import type { Context } from 'hono'

import type {
  CreateWorkspaceDto,
  WorkspaceDto,
} from '../../dto/workspace/workspace-dto.ts'
import {
  WorkspaceError,
  type WorkspaceState,
  type WorkspaceStore,
} from '../../infrastructure/workspace/workspace-store.ts'
import { selectNativeWorkspaceDirectory } from '../../infrastructure/workspace/native-directory-picker.ts'

function parseCreateWorkspace(value: unknown): CreateWorkspaceDto | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const record = value as Record<string, unknown>
  if (Object.keys(record).length !== 1 || typeof record.path !== 'string') {
    return undefined
  }
  const path = record.path.trim()
  return path ? { path } : undefined
}

const toDto = (workspace: WorkspaceState): WorkspaceDto => ({
  available: workspace.available,
  createdAt: workspace.createdAt,
  id: workspace.id,
  name: workspace.name,
})

function workspaceErrorResponse(context: Context, error: unknown) {
  if (error instanceof WorkspaceError) {
    return context.json(
      { code: error.code, message: error.message },
      error.status,
    )
  }
  return context.json(
    { code: 'WORKSPACE_REQUEST_FAILED', message: '工作区请求处理失败。' },
    500,
  )
}

/** 创建本地工作区注册与查询 Controller。 */
export function createWorkspaceController(workspaces: WorkspaceStore) {
  return {
    create: async (context: Context) => {
      const input = parseCreateWorkspace(
        await context.req.json<unknown>().catch(() => undefined),
      )
      if (!input) {
        return context.json(
          { code: 'INVALID_WORKSPACE_REQUEST', message: '工作区请求无效。' },
          400,
        )
      }
      try {
        return context.json(toDto(await workspaces.create(input.path)), 201)
      } catch (error) {
        return workspaceErrorResponse(context, error)
      }
    },
    list: async (context: Context) => {
      try {
        return context.json((await workspaces.list()).map(toDto))
      } catch (error) {
        return workspaceErrorResponse(context, error)
      }
    },
    select: async (context: Context) => {
      if (context.req.header('x-devaid-request') !== 'workspace-picker') {
        return context.json(
          {
            code: 'WORKSPACE_PICKER_FORBIDDEN',
            message: '工作区目录选择请求无效。',
          },
          403,
        )
      }
      try {
        const path = await selectNativeWorkspaceDirectory()
        if (path === null) return context.body(null, 204)
        return context.json(
          toDto(await workspaces.create(path, { reuseExisting: true })),
          201,
        )
      } catch (error) {
        return workspaceErrorResponse(context, error)
      }
    },
  }
}
