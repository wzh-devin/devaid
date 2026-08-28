import { randomUUID } from 'node:crypto'
import {
  chmod,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  rm,
  stat,
} from 'node:fs/promises'
import { basename, isAbsolute, join, resolve } from 'node:path'

interface WorkspaceDocument {
  version: 1
  workspaces: WorkspaceRecord[]
}

export interface WorkspaceRecord {
  createdAt: number
  id: string
  name: string
  path: string
}

export interface WorkspaceState extends WorkspaceRecord {
  available: boolean
}

export type WorkspaceErrorStatus = 400 | 404 | 409 | 500 | 501

/** 可安全映射到 HTTP 的本地工作区错误。 */
export class WorkspaceError extends Error {
  readonly code: string
  readonly status: WorkspaceErrorStatus

  constructor(code: string, message: string, status: WorkspaceErrorStatus) {
    super(message)
    this.name = 'WorkspaceError'
    this.code = code
    this.status = status
  }
}

function parseDocument(source: string): WorkspaceDocument {
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch {
    throw new WorkspaceError(
      'WORKSPACE_PERSISTENCE_FAILED',
      '工作区配置文件损坏，已保留原文件。',
      500,
    )
  }
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { version?: unknown }).version !== 1 ||
    !Array.isArray((value as { workspaces?: unknown }).workspaces)
  ) {
    throw new WorkspaceError(
      'WORKSPACE_PERSISTENCE_FAILED',
      '工作区配置文件无效，已保留原文件。',
      500,
    )
  }

  const workspaces = (value as { workspaces: unknown[] }).workspaces
  const ids = new Set<string>()
  const paths = new Set<string>()
  for (const workspace of workspaces) {
    if (!workspace || typeof workspace !== 'object') {
      throw new WorkspaceError(
        'WORKSPACE_PERSISTENCE_FAILED',
        '工作区配置内容无效，已保留原文件。',
        500,
      )
    }
    const record = workspace as Record<string, unknown>
    if (
      typeof record.id !== 'string' ||
      !record.id ||
      typeof record.name !== 'string' ||
      !record.name ||
      typeof record.path !== 'string' ||
      !isAbsolute(record.path) ||
      typeof record.createdAt !== 'number' ||
      !Number.isSafeInteger(record.createdAt) ||
      record.createdAt < 0 ||
      ids.has(record.id) ||
      paths.has(record.path)
    ) {
      throw new WorkspaceError(
        'WORKSPACE_PERSISTENCE_FAILED',
        '工作区配置内容无效，已保留原文件。',
        500,
      )
    }
    ids.add(record.id)
    paths.add(record.path)
  }
  return { version: 1, workspaces: workspaces as WorkspaceRecord[] }
}

async function isAvailable(path: string) {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

/** 在单个版本化 JSON 文件中维护本地工作区注册表。 */
export class WorkspaceStore {
  private readonly dataDirectory: string
  private readonly filePath: string
  private document?: WorkspaceDocument
  private mutation = Promise.resolve()

  constructor(dataDirectory: string) {
    this.dataDirectory = resolve(dataDirectory)
    this.filePath = join(this.dataDirectory, 'workspaces.json')
  }

  async list(): Promise<WorkspaceState[]> {
    const document = await this.readDocument()
    return Promise.all(
      document.workspaces.map(async (workspace) => ({
        ...workspace,
        available: await isAvailable(workspace.path),
      })),
    )
  }

  async create(path: string, options: { reuseExisting?: boolean } = {}) {
    if (!path || path.length > 4096 || !isAbsolute(path)) {
      throw new WorkspaceError(
        'INVALID_WORKSPACE_REQUEST',
        '请输入有效的工作区绝对路径。',
        400,
      )
    }

    let canonicalPath: string
    try {
      canonicalPath = await realpath(path)
      if (!(await stat(canonicalPath)).isDirectory()) throw new Error()
    } catch {
      throw new WorkspaceError(
        'WORKSPACE_UNAVAILABLE',
        '工作区目录不存在或不可访问。',
        409,
      )
    }

    return this.serialize(async () => {
      const document = await this.readDocument()
      const existing = document.workspaces.find(
        (workspace) => workspace.path === canonicalPath,
      )
      if (existing) {
        if (options.reuseExisting) return { ...existing, available: true }
        throw new WorkspaceError(
          'WORKSPACE_ALREADY_EXISTS',
          '该工作区已经添加。',
          409,
        )
      }
      const workspace: WorkspaceRecord = {
        createdAt: Date.now(),
        id: randomUUID(),
        name: basename(canonicalPath),
        path: canonicalPath,
      }
      await this.writeDocument({
        version: 1,
        workspaces: [...document.workspaces, workspace],
      })
      return { ...workspace, available: true }
    })
  }

  async requireAvailable(id: string) {
    const workspace = (await this.readDocument()).workspaces.find(
      (item) => item.id === id,
    )
    if (!workspace) {
      throw new WorkspaceError('WORKSPACE_NOT_FOUND', '工作区不存在。', 404)
    }
    if (!(await isAvailable(workspace.path))) {
      throw new WorkspaceError(
        'WORKSPACE_UNAVAILABLE',
        '工作区目录不存在或不可访问。',
        409,
      )
    }
    return { ...workspace, available: true }
  }

  private async readDocument(): Promise<WorkspaceDocument> {
    if (this.document) return this.document
    try {
      this.document = parseDocument(await readFile(this.filePath, 'utf8'))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.document = { version: 1, workspaces: [] }
      } else {
        throw error
      }
    }
    return this.document
  }

  private async writeDocument(document: WorkspaceDocument) {
    const tempPath = join(this.dataDirectory, `.workspaces-${randomUUID()}.tmp`)
    await mkdir(this.dataDirectory, { mode: 0o700, recursive: true })
    if (process.platform !== 'win32') {
      await chmod(this.dataDirectory, 0o700)
    }
    const handle = await open(tempPath, 'wx', 0o600)
    try {
      await handle.writeFile(`${JSON.stringify(document, null, 2)}\n`, 'utf8')
      await handle.sync()
      await handle.close()
      await rename(tempPath, this.filePath)
      if (process.platform !== 'win32') await chmod(this.filePath, 0o600)
      this.document = document
    } catch {
      await handle.close().catch(() => undefined)
      await rm(tempPath, { force: true }).catch(() => undefined)
      throw new WorkspaceError(
        'WORKSPACE_PERSISTENCE_FAILED',
        '工作区持久化失败。',
        500,
      )
    }
  }

  private async serialize<T>(operation: () => Promise<T>) {
    // ponytail: 单文件串行锁适合本地单 Server；出现多进程写入需求时再升级。
    const result = this.mutation.then(operation, operation)
    this.mutation = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }
}
