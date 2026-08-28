import type { ChatActivePage, ChatThread } from '../../../data/chat-types.ts'
import type { ChatWorkspace } from '../../../workspace/data/workspace-data.ts'

export interface ChatSidebarProps {
  activePage: ChatActivePage
  isWorkspaceLoading: boolean
  onWorkspaceAdd: () => Promise<ChatWorkspace | null>
  onWorkspaceSelect: (workspaceId: string) => void
  onSearch: () => void
  onSettings: () => void
  selectedWorkspaceId: string
  threads: readonly ChatThread[]
  workspaces: readonly ChatWorkspace[]
  workspaceError: string
}
