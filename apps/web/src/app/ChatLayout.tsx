import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { AppLayout } from '@agile-avocation/ui-pro/app-layout'
import type {
  ChatActivePage,
  ChatThread,
} from '../features/chat/chat-data.ts'
import { CHAT_THREADS } from '../features/chat/chat-data.ts'
import { ChatNavbar } from '../features/chat/components/ChatNavbar.tsx'
import { ChatSearchDialog } from '../features/chat/components/ChatSearchDialog.tsx'
import { ChatSidebar } from '../features/chat/components/ChatSidebar.tsx'
import { ChatWorkspaceContext } from '../features/chat/workspace-context.ts'
import type { ChatWorkspace } from '../features/chat/workspace-data.ts'
import { SettingsDialog } from '../features/settings/components/SettingsDialog.tsx'

interface ChatLayoutProps {
  activePage: ChatActivePage
  children: ReactNode
  onNavigate: (path: string, draft?: string) => void
  onWorkspaceAdd: (workspace: ChatWorkspace) => void
  onWorkspaceSelect: (workspaceId: string) => void
  selectedWorkspaceId: string
  workspaces: readonly ChatWorkspace[]
}

/** 组合聊天应用外壳，并统一管理搜索弹窗与全局快捷键。 */
export function ChatLayout({
  activePage,
  children,
  onNavigate,
  onWorkspaceAdd,
  onWorkspaceSelect,
  selectedWorkspaceId,
  workspaces,
}: ChatLayoutProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleThreadSelect = useCallback(
    (thread: ChatThread) => {
      setIsSearchOpen(false)
      onNavigate(`/${thread.id}`)
    },
    [onNavigate],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform)
      const metaPressed = isMac ? event.metaKey : event.ctrlKey

      if (metaPressed && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsSearchOpen((open) => !open)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <ChatWorkspaceContext.Provider
      value={{ onWorkspaceSelect, selectedWorkspaceId, workspaces }}
    >
      <AppLayout
        navigate={onNavigate}
        sidebarCollapsible="icon"
        navbar={
          <ChatNavbar
            activePage={activePage}
            onSearch={() => setIsSearchOpen(true)}
          />
        }
        sidebar={
          <ChatSidebar
            activePage={activePage}
            selectedWorkspaceId={selectedWorkspaceId}
            workspaces={workspaces}
            onSearch={() => setIsSearchOpen(true)}
            onSettings={() => setIsSettingsOpen(true)}
            onWorkspaceAdd={onWorkspaceAdd}
            onWorkspaceSelect={onWorkspaceSelect}
            threads={CHAT_THREADS}
          />
        }
      >
        {children}
        <ChatSearchDialog
          isOpen={isSearchOpen}
          threads={CHAT_THREADS}
          onOpenChange={setIsSearchOpen}
          onSelect={handleThreadSelect}
        />
        <SettingsDialog
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />
      </AppLayout>
    </ChatWorkspaceContext.Provider>
  )
}
