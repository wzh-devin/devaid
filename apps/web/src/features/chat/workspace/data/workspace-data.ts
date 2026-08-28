export interface ChatWorkspace {
  available: boolean
  id: string
  label: string
  threadIds: readonly string[]
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
