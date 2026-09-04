export interface ChatWorkspace {
  available: boolean
  id: string
  label: string
  threadIds: readonly string[]
}

interface WorkspaceArchiveResult {
  archivedCount: number
  failedCount: number
  firstError: string
}

/** 顺序归档工作区会话，并保留部分失败结果供界面提示和恢复。 */
export const archiveWorkspaceThreads = async (
  threadIds: readonly string[],
  archiveThread: (threadId: string) => Promise<string>,
): Promise<WorkspaceArchiveResult> => {
  let archivedCount = 0
  let firstError = ''

  for (const threadId of threadIds) {
    const error = await archiveThread(threadId)
    if (error) firstError ||= error
    else archivedCount += 1
  }

  return {
    archivedCount,
    failedCount: threadIds.length - archivedCount,
    firstError,
  }
}

/** 查找包含指定会话的工作区。 */
export const findWorkspaceByThreadId = (
  workspaces: readonly ChatWorkspace[],
  threadId: string,
) => workspaces.find((workspace) => workspace.threadIds.includes(threadId))

/** 固定工作区存在时锁定 Composer，否则沿用当前可选工作区。 */
export const resolveComposerWorkspace = (
  selectedWorkspaceId: string,
  fixedWorkspaceId?: string,
) => ({
  isSelectable: fixedWorkspaceId === undefined,
  workspaceId: fixedWorkspaceId ?? selectedWorkspaceId,
})
