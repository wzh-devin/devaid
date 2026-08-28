import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { WorkspaceError } from './workspace-store.ts'

type RunCommand = (
  file: string,
  arguments_: string[],
  options: { encoding: 'utf8'; timeout: number },
) => Promise<{ stdout: string }>

const runCommand = promisify(execFile) as RunCommand

const isUserCancellation = (error: unknown) =>
  !!error &&
  typeof error === 'object' &&
  typeof (error as { stderr?: unknown }).stderr === 'string' &&
  /User canceled|-128/u.test((error as { stderr: string }).stderr)

/** 在本地 Server 所在系统打开原生目录选择器，并返回用户选择的绝对路径。 */
export async function selectNativeWorkspaceDirectory(
  options: {
    platform?: NodeJS.Platform
    run?: RunCommand
  } = {},
) {
  if ((options.platform ?? process.platform) !== 'darwin') {
    throw new WorkspaceError(
      'WORKSPACE_PICKER_UNAVAILABLE',
      '当前系统暂不支持打开本地目录选择器。',
      501,
    )
  }

  try {
    const { stdout } = await (options.run ?? runCommand)(
      'osascript',
      ['-e', 'POSIX path of (choose folder with prompt "选择 Devaid 工作区")'],
      { encoding: 'utf8', timeout: 5 * 60 * 1000 },
    )
    const path = stdout.trim()
    if (path) return path
  } catch (error) {
    if (isUserCancellation(error)) return null
    throw new WorkspaceError(
      'WORKSPACE_PICKER_FAILED',
      '无法打开本地目录选择器，请重试。',
      500,
    )
  }

  throw new WorkspaceError(
    'WORKSPACE_PICKER_FAILED',
    '目录选择器没有返回有效路径。',
    500,
  )
}
