import { chmod, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  FileError,
  JsonlSessionRepo,
  type Result,
} from '@earendil-works/pi-agent-core'
import { NodeExecutionEnv } from '@earendil-works/pi-agent-core/node'

class PrivateNodeExecutionEnv extends NodeExecutionEnv {
  /** 确保 Pi 创建的 Session 目录只允许当前用户访问。 */
  override async createDir(path: string, options?: { recursive?: boolean }) {
    const result = await super.createDir(path, options)
    if (!result.ok || process.platform === 'win32') return result
    return this.setPrivateMode(path, 0o700)
  }

  /** 确保 JSONL 及其原子修复临时文件使用最小权限。 */
  override async writeFile(
    path: string,
    content: string | Uint8Array,
    abortSignal?: AbortSignal,
  ) {
    const result = await super.writeFile(path, content, abortSignal)
    if (!result.ok || process.platform === 'win32') return result
    return this.setPrivateMode(path, 0o600)
  }

  private async setPrivateMode(
    path: string,
    mode: number,
  ): Promise<Result<void, FileError>> {
    const absolute = await super.absolutePath(path)
    if (!absolute.ok) return absolute
    try {
      await chmod(absolute.value, mode)
      return { ok: true, value: undefined }
    } catch (error) {
      return {
        error: new FileError(
          'permission_denied',
          '无法收敛 Session 文件权限。',
          absolute.value,
          error instanceof Error ? error : new Error(String(error)),
        ),
        ok: false,
      }
    }
  }
}

/** 创建由 Server Composition Root 拥有的 Pi JSONL Session Repository。 */
export async function createJsonlSessionRepository(dataDirectory: string) {
  const directory = resolve(dataDirectory)
  const sessionsRoot = resolve(directory, 'sessions')
  await mkdir(sessionsRoot, { mode: 0o700, recursive: true })
  if (process.platform !== 'win32') {
    await Promise.all([chmod(directory, 0o700), chmod(sessionsRoot, 0o700)])
  }

  const repository = new JsonlSessionRepo({
    fs: new PrivateNodeExecutionEnv({ cwd: directory }),
    sessionsRoot,
  })
  await repository.list()
  return repository
}
