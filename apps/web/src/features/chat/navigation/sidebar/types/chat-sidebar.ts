import type { ChatActivePage, ChatThread } from '../../../data/chat-types.ts'
import type { ChatWorkspace } from '../../../workspace/data/workspace-data.ts'

export interface ChatSidebarProps {
  activePage: ChatActivePage
  isWorkspaceLoading: boolean
  onThreadArchive: (threadId: string) => Promise<string>
  onThreadRename: (threadId: string, name: string) => Promise<string>
  onWorkspaceAdd: () => Promise<ChatWorkspace | null>
  onWorkspaceDelete: (workspaceId: string) => Promise<string>
  onWorkspaceSelect: (workspaceId: string) => void
  onSearch: () => void
  onSettings: () => void
  selectedWorkspaceId: string
  threads: readonly ChatThread[]
  workspaces: readonly ChatWorkspace[]
  workspaceError: string
}
