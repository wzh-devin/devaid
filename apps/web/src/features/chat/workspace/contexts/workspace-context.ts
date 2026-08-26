import { createContext, useContext } from 'react'
import type { ChatWorkspace } from '../data/workspace-data.ts'

interface ChatWorkspaceContextValue {
  onWorkspaceSelect: (workspaceId: string) => void
  selectedWorkspaceId: string
  workspaces: readonly ChatWorkspace[]
}

export const ChatWorkspaceContext =
  createContext<ChatWorkspaceContextValue | null>(null)

/** 读取聊天外壳提供的活动工作区。 */
export const useChatWorkspace = () => {
  const workspaceContext = useContext(ChatWorkspaceContext)

  if (!workspaceContext) {
    throw new Error('useChatWorkspace 必须在 ChatWorkspaceContext 内使用。')
  }

  return workspaceContext
}
