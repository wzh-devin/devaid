import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { chmod, mkdir, open, readFile, rename, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

import { WorkspaceError } from './workspace-store.ts'

const SELECTION_TTL_MS = 10 * 60 * 1000

export interface FileEditor {
  bundleId: string
  name: string
}

interface FileEditorDocument {
  defaultEditor: FileEditor | null
  version: 1
}

interface PendingSelection {
  editor: FileEditor
  expiresAt: number
}

export type FileEditorRunCommand = (
  file: string,
  arguments_: string[],
  options: { encoding: 'utf8'; timeout: number },
) => Promise<{ stdout: string }>

const runCommand = promisify(execFile) as FileEditorRunCommand

const isUserCancellation = (error: unknown) =>
  !!error &&
  typeof error === 'object' &&
  typeof (error as { stderr?: unknown }).stderr === 'string' &&
  /User canceled|-128/u.test((error as { stderr: string }).stderr)

const isEditor = (value: unknown): value is FileEditor => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    Object.keys(record).length === 2 &&
    typeof record.name === 'string' &&
    record.name.length > 0 &&
    record.name.length <= 200 &&
    typeof record.bundleId === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9.-]{0,254}$/u.test(record.bundleId)
  )
}

function parseDocument(source: string): FileEditorDocument {
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch {
    throw new WorkspaceError(
      'FILE_EDITOR_PERSISTENCE_FAILED',
      '默认编辑器配置损坏，已保留原文件。',
      500,
    )
  }
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== 2 ||
    (value as { version?: unknown }).version !== 1 ||
    ((value as { defaultEditor?: unknown }).defaultEditor !== null &&
      !isEditor((value as { defaultEditor?: unknown }).defaultEditor))
  ) {
    throw new WorkspaceError(
      'FILE_EDITOR_PERSISTENCE_FAILED',
      '默认编辑器配置无效，已保留原文件。',
      500,
    )
  }
  return value as FileEditorDocument
}

/** 管理 macOS 本地应用选择、文件打开与默认编辑器持久化。 */
export class FileEditorService {
  private readonly dataDirectory: string
  private readonly filePath: string
  private readonly pendingSelections = new Map<string, PendingSelection>()
  private readonly platform: NodeJS.Platform
  private readonly run: FileEditorRunCommand
  private document?: FileEditorDocument
  private mutation = Promise.resolve()

  constructor(
    dataDirectory: string,
    options: {
      platform?: NodeJS.Platform
      run?: FileEditorRunCommand
    } = {},
  ) {
    this.dataDirectory = resolve(dataDirectory)
    this.filePath = join(this.dataDirectory, 'file-editor.json')
    this.platform = options.platform ?? process.platform
    this.run = options.run ?? runCommand
  }

  get supported() {
    return this.platform === 'darwin'
  }

  async getDefaultEditor() {
    return (await this.readDocument()).defaultEditor
  }

  async selectEditor() {
    this.requireSupported()
    try {
      const { stdout } = await this.run(
        '/usr/bin/osascript',
        [
          '-e',
          'set selectedApplication to choose application with prompt "选择打开文件的应用"',
          '-e',
          'return (name of selectedApplication) & linefeed & (id of selectedApplication)',
        ],
        { encoding: 'utf8', timeout: 5 * 60 * 1000 },
      )
      const parts = stdout.trim().split(/\r?\n/u)
      const editor = {
        bundleId: parts[1],
        name: parts[0],
      }
      if (parts.length !== 2 || !isEditor(editor)) {
        throw new WorkspaceError(
          'FILE_EDITOR_SELECTION_FAILED',
          '无法识别所选应用。',
          400,
        )
      }
      this.pruneSelections()
      const selectionId = randomUUID()
      this.pendingSelections.set(selectionId, {
        editor,
        expiresAt: Date.now() + SELECTION_TTL_MS,
      })
      return { name: editor.name, selectionId }
    } catch (error) {
      if (isUserCancellation(error)) return null
      if (error instanceof WorkspaceError) throw error
      throw new WorkspaceError(
        'FILE_EDITOR_SELECTION_FAILED',
        '无法打开本地应用选择器。',
        500,
      )
    }
  }

  async openFile(
    absolutePath: string,
    options: { remember?: boolean; selectionId?: string } = {},
  ) {
    this.requireSupported()
    const editor = options.selectionId
      ? this.requireSelection(options.selectionId)
      : await this.getDefaultEditor()
    if (!editor) {
      throw new WorkspaceError(
        'FILE_EDITOR_REQUIRED',
        '请先选择打开文件的应用。',
        409,
      )
    }

    try {
      await this.run('/usr/bin/open', ['-b', editor.bundleId, absolutePath], {
        encoding: 'utf8',
        timeout: 30_000,
      })
    } catch {
      throw new WorkspaceError(
        'FILE_EDITOR_UNAVAILABLE',
        '无法使用所选应用打开文件，请重新选择应用。',
        409,
      )
    }

    if (options.remember) {
      try {
        await this.writeDefaultEditor(editor)
      } catch (error) {
        if (
          error instanceof WorkspaceError &&
          error.code === 'FILE_EDITOR_PERSISTENCE_FAILED'
        ) {
          throw new WorkspaceError(
            error.code,
            '文件已打开，但无法保存默认编辑器。',
            error.status,
          )
        }
        throw error
      }
    }
    if (options.selectionId) this.pendingSelections.delete(options.selectionId)
    return { editor, remembered: Boolean(options.remember) }
  }

  async rememberSelection(selectionId: string) {
    const editor = this.requireSelection(selectionId)
    await this.writeDefaultEditor(editor)
    this.pendingSelections.delete(selectionId)
    return editor
  }

  async clearDefaultEditor() {
    await this.writeDefaultEditor(null)
  }

  private requireSupported() {
    if (!this.supported) {
      throw new WorkspaceError(
        'FILE_EDITOR_UNAVAILABLE',
        '当前系统暂不支持选择本地应用打开文件。',
        501,
      )
    }
  }

  private requireSelection(selectionId: string) {
    this.pruneSelections()
    const selection = this.pendingSelections.get(selectionId)
    if (!selection) {
      throw new WorkspaceError(
        'FILE_EDITOR_SELECTION_EXPIRED',
        '应用选择已过期，请重新选择。',
        409,
      )
    }
    return selection.editor
  }

  private pruneSelections() {
    const now = Date.now()
    for (const [selectionId, selection] of this.pendingSelections) {
      if (selection.expiresAt <= now) this.pendingSelections.delete(selectionId)
    }
  }

  private async readDocument(): Promise<FileEditorDocument> {
    if (this.document) return this.document
    try {
      this.document = parseDocument(await readFile(this.filePath, 'utf8'))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.document = { defaultEditor: null, version: 1 }
      } else {
        throw error
      }
    }
    return this.document
  }

  private async writeDefaultEditor(editor: FileEditor | null) {
    return this.serialize(async () => {
      await this.readDocument()
      const document: FileEditorDocument = {
        defaultEditor: editor,
        version: 1,
      }
      const tempPath = join(
        this.dataDirectory,
        `.file-editor-${randomUUID()}.tmp`,
      )
      let handle: Awaited<ReturnType<typeof open>> | undefined
      try {
        await mkdir(this.dataDirectory, { mode: 0o700, recursive: true })
        if (this.platform !== 'win32') await chmod(this.dataDirectory, 0o700)
        handle = await open(tempPath, 'wx', 0o600)
        await handle.writeFile(`${JSON.stringify(document, null, 2)}\n`, 'utf8')
        await handle.sync()
        await handle.close()
        await rename(tempPath, this.filePath)
        if (this.platform !== 'win32') await chmod(this.filePath, 0o600)
        this.document = document
      } catch {
        await handle?.close().catch(() => undefined)
        await rm(tempPath, { force: true }).catch(() => undefined)
        throw new WorkspaceError(
          'FILE_EDITOR_PERSISTENCE_FAILED',
          editor ? '无法保存默认编辑器。' : '无法清除默认编辑器。',
          500,
        )
      }
    })
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
