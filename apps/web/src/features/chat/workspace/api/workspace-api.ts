export interface WorkspaceVo {
  available: boolean
  createdAt: number
  id: string
  name: string
}

export interface WorkspaceFileVo {
  content: string
  modifiedAt: number
  path: string
  size: number
}

export class WorkspaceApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code: string, status = 0) {
    super(message)
    this.name = 'WorkspaceApiError'
    this.code = code
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as
      { code?: string; message?: string } | undefined
    throw new WorkspaceApiError(
      body?.message ?? `请求失败（${response.status}）`,
      body?.code ?? 'WORKSPACE_REQUEST_FAILED',
      response.status,
    )
  }
  if (response.status === 204) return null as T
  return (await response.json()) as T
}

/** 读取服务端持久化的工作区列表。 */
export const listWorkspaces = () => request<WorkspaceVo[]>('/api/workspaces')

/** 请求本地 Server 打开系统目录选择器，取消时返回 null。 */
export const selectWorkspace = () =>
  request<WorkspaceVo | null>('/api/workspaces/select', {
    headers: { 'x-devaid-request': 'workspace-picker' },
    method: 'POST',
  })

/** 注册一个由服务端校验和规范化的本地工作区。 */
export const createWorkspace = (path: string) =>
  request<WorkspaceVo>('/api/workspaces', {
    body: JSON.stringify({ path }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

/** 读取注册工作区内经过服务端边界校验的 UTF-8 文本文件。 */
export const readWorkspaceFile = (
  workspaceId: string,
  path: string,
  signal?: AbortSignal,
) => {
  const query = new URLSearchParams({ path })
  return request<WorkspaceFileVo>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/files/content?${query}`,
    {
      headers: { 'x-devaid-request': 'workspace-file-preview' },
      signal,
    },
  )
}
