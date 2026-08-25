export interface WorkspaceDirectoryHandle {
  isSameEntry: (other: WorkspaceDirectoryHandle) => Promise<boolean>
  name: string
}

export interface WorkspaceDirectoryPickerWindow extends Window {
  showDirectoryPicker?: () => Promise<WorkspaceDirectoryHandle>
}

export interface ChatWorkspace {
  directoryHandle?: WorkspaceDirectoryHandle
  id: string
  label: string
  threadIds: readonly string[]
}

export const INITIAL_CHAT_WORKSPACES: readonly ChatWorkspace[] = [
  {
    id: 'assets',
    label: 'assets',
    threadIds: ['pro-ai-showcase'],
  },
  {
    id: 'mine-knowledge',
    label: 'mine-knowledge',
    threadIds: [
      'quick-recipes-for-dinner',
      'launch-plan-for-q3-rollout',
      'rewrite-homepage-value-prop',
      'weekly-team-update-summary',
    ],
  },
] as const

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

/** 按浏览器目录句柄识别已经添加的真实工作区。 */
export const findWorkspaceByDirectory = async (
  workspaces: readonly ChatWorkspace[],
  directoryHandle: WorkspaceDirectoryHandle,
) => {
  for (const workspace of workspaces) {
    if (
      workspace.directoryHandle &&
      (await workspace.directoryHandle.isSameEntry(directoryHandle))
    ) {
      return workspace
    }
  }

  return undefined
}
