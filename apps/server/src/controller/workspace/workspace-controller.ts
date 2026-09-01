import { WorkspaceExecutionEnv } from '@devaid/agent-tools'
import type { Context } from 'hono'

import type {
  CreateWorkspaceDto,
  WorkspaceDto,
  WorkspaceFileDto,
} from '../../dto/workspace/workspace-dto.ts'
import {
  WorkspaceError,
  type WorkspaceState,
  type WorkspaceStore,
} from '../../infrastructure/workspace/workspace-store.ts'
import { selectNativeWorkspaceDirectory } from '../../infrastructure/workspace/native-directory-picker.ts'

const MAX_PREVIEW_BYTES = 1024 * 1024

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

function fileErrorResponse(context: Context, code: string) {
  if (code === 'permission_denied') {
    return context.json(
      { code: 'FILE_PREVIEW_FORBIDDEN', message: '该文件不在当前工作区内。' },
      403,
    )
  }
  if (code === 'not_found') {
    return context.json(
      { code: 'FILE_PREVIEW_NOT_FOUND', message: '文件不存在或已被删除。' },
      404,
    )
  }
  if (code === 'invalid' || code === 'is_directory') {
    return context.json(
      { code: 'INVALID_FILE_PREVIEW', message: '文件路径无效。' },
      400,
    )
  }
  return context.json(
    { code: 'FILE_PREVIEW_FAILED', message: '无法读取该文件。' },
    500,
  )
}

/** 创建本地工作区注册与查询 Controller。 */
export function createWorkspaceController(
  workspaces: WorkspaceStore,
  dataDirectory: string,
) {
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
    readFile: async (context: Context) => {
      context.header('cache-control', 'no-store')
      context.header('x-content-type-options', 'nosniff')
      if (context.req.header('x-devaid-request') !== 'workspace-file-preview') {
        return context.json(
          {
            code: 'FILE_PREVIEW_FORBIDDEN',
            message: '文件预览请求无效。',
          },
          403,
        )
      }
      const path = context.req.query('path')
      const workspaceId = context.req.param('workspaceId')
      if (!workspaceId || !path || path.length > 4096 || path.includes('\0')) {
        return context.json(
          { code: 'INVALID_FILE_PREVIEW', message: '文件路径无效。' },
          400,
        )
      }

      try {
        const workspace = await workspaces.requireAvailable(workspaceId)
        const environment = await WorkspaceExecutionEnv.create(workspace.path, [
          dataDirectory,
        ])
        const info = await environment.fileInfo(path)
        if (!info.ok) return fileErrorResponse(context, info.error.code)
        if (info.value.kind !== 'file') {
          return context.json(
            {
              code: 'INVALID_FILE_PREVIEW',
              message: '只能预览普通文件。',
            },
            400,
          )
        }
        if (info.value.size > MAX_PREVIEW_BYTES) {
          return context.json(
            {
              code: 'FILE_PREVIEW_TOO_LARGE',
              message: '文件超过 1 MiB，无法预览。',
            },
            413,
          )
        }

        const bytes = await environment.readBinaryFile(path)
        if (!bytes.ok) return fileErrorResponse(context, bytes.error.code)
        if (bytes.value.byteLength > MAX_PREVIEW_BYTES) {
          return context.json(
            {
              code: 'FILE_PREVIEW_TOO_LARGE',
              message: '文件超过 1 MiB，无法预览。',
            },
            413,
          )
        }
        let content: string
        try {
          content = new TextDecoder('utf-8', { fatal: true }).decode(
            bytes.value,
          )
        } catch {
          return context.json(
            {
              code: 'FILE_PREVIEW_UNSUPPORTED',
              message: '该文件不是受支持的 UTF-8 文本。',
            },
            415,
          )
        }
        if (content.includes('\0')) {
          return context.json(
            {
              code: 'FILE_PREVIEW_UNSUPPORTED',
              message: '该文件不是受支持的文本文件。',
            },
            415,
          )
        }

        return context.json({
          content,
          modifiedAt: info.value.mtimeMs,
          path,
          size: bytes.value.byteLength,
        } satisfies WorkspaceFileDto)
      } catch (error) {
        if (
          !(error instanceof WorkspaceError) &&
          error &&
          typeof error === 'object' &&
          typeof (error as { code?: unknown }).code === 'string'
        ) {
          return fileErrorResponse(context, (error as { code: string }).code)
        }
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
