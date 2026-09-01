import { randomUUID } from 'node:crypto'
import { chmod, stat } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path'

import {
  ExecutionError,
  FileError,
  type FileInfo,
  type Result,
  type ShellExecOptions,
} from '@earendil-works/pi-agent-core'
import { NodeExecutionEnv } from '@earendil-works/pi-agent-core/node'

const fileError = <T>(error: FileError): Result<T, FileError> => ({
  error,
  ok: false,
})

const fileValue = <T>(value: T): Result<T, FileError> => ({ ok: true, value })

const denied = <T = never>(): Result<T, FileError> =>
  fileError<T>(
    new FileError('permission_denied', 'Path is outside the active workspace.'),
  )

const invalid = <T = never>(message: string): Result<T, FileError> =>
  fileError<T>(new FileError('invalid', message))

const isWithin = (root: string, path: string) => {
  const child = relative(root, path)
  return child === '' || (!child.startsWith('..') && !isAbsolute(child))
}

/** 将 Pi 文件能力限制在单个注册工作区，且不提供 Shell。 */
export class WorkspaceExecutionEnv extends NodeExecutionEnv {
  private readonly protectedRoots: string[]
  private readonly workspaceRoot: string

  private constructor(workspaceRoot: string, protectedRoots: string[]) {
    super({ cwd: workspaceRoot })
    this.workspaceRoot = workspaceRoot
    this.protectedRoots = protectedRoots
  }

  static async create(cwd: string, protectedRoots: readonly string[] = []) {
    const base = new NodeExecutionEnv({ cwd })
    const root = await base.canonicalPath(cwd)
    if (!root.ok) throw root.error
    const canonicalProtectedRoots: string[] = []
    for (const protectedRoot of protectedRoots) {
      const canonical = await base.canonicalPath(protectedRoot)
      if (canonical.ok) canonicalProtectedRoots.push(canonical.value)
    }
    return new WorkspaceExecutionEnv(root.value, canonicalProtectedRoots)
  }

  /** 审批前生成工作区相对资源；执行时文件方法仍会重复校验。 */
  async describePath(path: string, effect: 'read' | 'write') {
    if (isAbsolute(path)) {
      throw new FileError('invalid', 'Tool paths must be workspace-relative.')
    }
    const addressed = await this.resolveUserPath(path)
    if (!addressed.ok) throw addressed.error
    const guarded =
      effect === 'read'
        ? await this.guardExisting(addressed.value, true)
        : await this.guardWrite(addressed.value)
    if (!guarded.ok) throw guarded.error
    return relative(this.workspaceRoot, guarded.value) || '.'
  }

  override async absolutePath(
    path: string,
  ): Promise<Result<string, FileError>> {
    return this.resolveUserPath(path)
  }

  override async joinPath(parts: string[]): Promise<Result<string, FileError>> {
    if (parts.some((part) => part.includes('\0'))) {
      return invalid('Path contains an invalid character.')
    }
    const joined = resolve(...parts)
    return this.guardSyntactic(joined)
  }

  override async exec(
    _command: string,
    _options?: ShellExecOptions,
  ): Promise<
    Result<{ exitCode: number; stderr: string; stdout: string }, ExecutionError>
  > {
    return {
      error: new ExecutionError(
        'shell_unavailable',
        'Process execution is not available without a configured sandbox.',
      ),
      ok: false,
    }
  }

  override async readTextFile(path: string, abortSignal?: AbortSignal) {
    const guarded = await this.guardExisting(path)
    return guarded.ok ? super.readTextFile(guarded.value, abortSignal) : guarded
  }

  override async readTextLines(
    path: string,
    options?: { abortSignal?: AbortSignal; maxLines?: number },
  ) {
    const guarded = await this.guardExisting(path)
    return guarded.ok ? super.readTextLines(guarded.value, options) : guarded
  }

  override async readBinaryFile(path: string, abortSignal?: AbortSignal) {
    const guarded = await this.guardExisting(path)
    return guarded.ok
      ? super.readBinaryFile(guarded.value, abortSignal)
      : guarded
  }

  override async writeFile(
    path: string,
    content: string | Uint8Array,
    abortSignal?: AbortSignal,
  ) {
    const guarded = await this.guardWrite(path)
    if (!guarded.ok) return guarded
    if (abortSignal?.aborted) {
      return fileError<void>(new FileError('aborted', 'aborted'))
    }

    const target = guarded.value
    const parent = dirname(target)
    const created = await super.createDir(parent, { recursive: true })
    if (!created.ok) return created
    const temp = resolve(
      parent,
      `.${basename(target)}.devaid-${randomUUID()}.tmp`,
    )
    const written = await super.writeFile(temp, content, abortSignal)
    if (!written.ok) return written
    try {
      const existing = await stat(target).catch(() => undefined)
      if (existing) await chmod(temp, existing.mode & 0o777)
      const checkedAgain = await this.guardWrite(target)
      if (!checkedAgain.ok) {
        await super.remove(temp, { force: true })
        return checkedAgain
      }
      const renamed = await super.renameFile(
        temp,
        checkedAgain.value,
        abortSignal,
      )
      if (!renamed.ok) await super.remove(temp, { force: true })
      return renamed
    } catch (error) {
      await super.remove(temp, { force: true })
      return fileError<void>(
        new FileError(
          'unknown',
          'Unable to atomically replace the workspace file.',
          undefined,
          error instanceof Error ? error : undefined,
        ),
      )
    }
  }

  override async appendFile(_path: string, _content: string | Uint8Array) {
    return fileError<void>(
      new FileError('not_supported', 'Append is not available.'),
    )
  }

  override async renameFile(
    sourcePath: string,
    destinationPath: string,
    abortSignal?: AbortSignal,
  ) {
    const source = await this.guardExisting(sourcePath)
    if (!source.ok) return source
    const destination = await this.guardWrite(destinationPath)
    if (!destination.ok) return destination
    return super.renameFile(source.value, destination.value, abortSignal)
  }

  override async fileInfo(path: string) {
    const guarded = await this.guardExisting(path)
    return guarded.ok ? super.fileInfo(guarded.value) : guarded
  }

  override async listDir(path: string, abortSignal?: AbortSignal) {
    const guarded = await this.guardExisting(path)
    if (!guarded.ok) return guarded as Result<FileInfo[], FileError>
    return super.listDir(guarded.value, abortSignal)
  }

  override async canonicalPath(path: string) {
    return this.guardExisting(path)
  }

  override async exists(path: string) {
    const addressed = this.addressedPath(path)
    const syntactic = this.guardSyntactic(addressed)
    if (!syntactic.ok) return syntactic as Result<boolean, FileError>
    const exists = await super.exists(syntactic.value)
    if (!exists.ok || !exists.value) return exists
    const guarded = await this.guardExisting(syntactic.value)
    return guarded.ok
      ? fileValue(true)
      : (guarded as Result<boolean, FileError>)
  }

  override async createDir(
    path: string,
    options?: { abortSignal?: AbortSignal; recursive?: boolean },
  ) {
    const guarded = await this.guardWrite(path)
    return guarded.ok ? super.createDir(guarded.value, options) : guarded
  }

  override async remove(
    path: string,
    options?: {
      abortSignal?: AbortSignal
      force?: boolean
      recursive?: boolean
    },
  ) {
    const guarded = await this.guardExisting(path, options?.force)
    return guarded.ok ? super.remove(guarded.value, options) : guarded
  }

  override async createTempDir(_prefix?: string) {
    return fileError<string>(
      new FileError(
        'not_supported',
        'Temporary directories are not available.',
      ),
    )
  }

  override async createTempFile() {
    return fileError<string>(
      new FileError('not_supported', 'Temporary files are not available.'),
    )
  }

  private async resolveUserPath(
    path: string,
  ): Promise<Result<string, FileError>> {
    if (
      !path ||
      path.includes('\0') ||
      path === '~' ||
      path.startsWith('~/') ||
      path.startsWith('file:')
    ) {
      return invalid('Tool paths must be workspace-relative.')
    }
    return this.guardSyntactic(this.addressedPath(path))
  }

  private addressedPath(path: string) {
    return isAbsolute(path) ? resolve(path) : resolve(this.workspaceRoot, path)
  }

  private guardSyntactic(path: string): Result<string, FileError> {
    if (!isWithin(this.workspaceRoot, path) || this.isProtected(path)) {
      return denied()
    }
    return fileValue(path)
  }

  private async guardExisting(
    path: string,
    allowMissing = false,
  ): Promise<Result<string, FileError>> {
    const syntactic = this.guardSyntactic(this.addressedPath(path))
    if (!syntactic.ok) return syntactic
    const canonical = await super.canonicalPath(syntactic.value)
    if (!canonical.ok) {
      return allowMissing && canonical.error.code === 'not_found'
        ? syntactic
        : canonical
    }
    if (
      !isWithin(this.workspaceRoot, canonical.value) ||
      this.isProtected(canonical.value)
    ) {
      return denied()
    }
    return canonical
  }

  private async guardWrite(path: string): Promise<Result<string, FileError>> {
    const syntactic = this.guardSyntactic(this.addressedPath(path))
    if (!syntactic.ok) return syntactic
    let existing = syntactic.value

    while (isWithin(this.workspaceRoot, existing)) {
      const found = await super.exists(existing)
      if (!found.ok) return found as Result<string, FileError>
      if (found.value) {
        const canonical = await super.canonicalPath(existing)
        if (!canonical.ok) return canonical
        if (
          !isWithin(this.workspaceRoot, canonical.value) ||
          this.isProtected(canonical.value)
        ) {
          return denied()
        }
        const suffix = relative(existing, syntactic.value)
        const target = suffix
          ? resolve(canonical.value, suffix)
          : canonical.value
        return this.guardSyntactic(target)
      }
      const parent = dirname(existing)
      if (parent === existing) break
      existing = parent
    }
    return denied()
  }

  private isProtected(path: string) {
    return this.protectedRoots.some(
      (protectedRoot) =>
        isWithin(protectedRoot, path) || path === protectedRoot,
    )
  }
}
