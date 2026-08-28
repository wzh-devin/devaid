import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { AppLayout } from '@agile-avocation/ui-pro/app-layout'
import '../styles/ChatLayout.css'
import {
  type ChatActivePage,
  ChatNavbar,
  ChatSearchDialog,
  ChatSidebar,
  type ChatThread,
  ChatWorkspaceContext,
  type ChatWorkspace,
  WorkspaceChangesPanel,
} from '../features/chat/index.ts'
import {
  type PluginSettingsTab,
  SettingsDialog,
  SettingsProvider,
} from '../features/settings/index.ts'

interface ChatLayoutProps {
  activePage: ChatActivePage
  children: ReactNode
  isWorkspaceLoading: boolean
  onNavigate: (path: string, draft?: string) => void
  onWorkspaceAdd: () => Promise<ChatWorkspace | null>
  onWorkspaceSelect: (workspaceId: string) => void
  selectedWorkspaceId: string
  threads: readonly ChatThread[]
  workspaces: readonly ChatWorkspace[]
  workspaceError: string
}

/** 组合聊天应用外壳，并统一管理搜索弹窗与全局快捷键。 */
export function ChatLayout({
  activePage,
  children,
  isWorkspaceLoading,
  onNavigate,
  onWorkspaceAdd,
  onWorkspaceSelect,
  selectedWorkspaceId,
  threads,
  workspaces,
  workspaceError,
}: ChatLayoutProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isWorkspaceChangesOpen, setIsWorkspaceChangesOpen] = useState(false)
  const [settingsTarget, setSettingsTarget] = useState<{
    pluginTab: PluginSettingsTab
    section: 'general' | 'plugins'
  }>({ pluginTab: 'skills', section: 'general' })
  const isThreadPage = activePage.kind === 'thread'

  const openPluginSettings = useCallback((pluginTab: PluginSettingsTab) => {
    setSettingsTarget({ pluginTab, section: 'plugins' })
    setIsSettingsOpen(true)
  }, [])

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
    <SettingsProvider onOpenPluginSettings={openPluginSettings}>
      <ChatWorkspaceContext.Provider
        value={{ onWorkspaceSelect, selectedWorkspaceId, workspaces }}
      >
        <AppLayout
          aside={isThreadPage ? <WorkspaceChangesPanel /> : undefined}
          asideDefaultSize="420px"
          asideMaxSize="50%"
          asideMinSize="360px"
          asideMobile="sheet"
          asideOpen={isThreadPage && isWorkspaceChangesOpen}
          asideResizable={isThreadPage}
          className={isThreadPage ? 'chat-layout--thread' : undefined}
          key={isThreadPage ? 'thread-layout' : 'standard-layout'}
          navigate={onNavigate}
          sidebarCollapsible="icon"
          onAsideOpenChange={setIsWorkspaceChangesOpen}
          navbar={
            <ChatNavbar
              activePage={activePage}
              onSearch={() => setIsSearchOpen(true)}
            />
          }
          sidebar={
            <ChatSidebar
              activePage={activePage}
              isWorkspaceLoading={isWorkspaceLoading}
              selectedWorkspaceId={selectedWorkspaceId}
              workspaces={workspaces}
              workspaceError={workspaceError}
              onSearch={() => setIsSearchOpen(true)}
              onSettings={() => {
                setSettingsTarget((currentTarget) => ({
                  ...currentTarget,
                  section: 'general',
                }))
                setIsSettingsOpen(true)
              }}
              onWorkspaceAdd={onWorkspaceAdd}
              onWorkspaceSelect={onWorkspaceSelect}
              threads={threads}
            />
          }
        >
          {children}
          <ChatSearchDialog
            isOpen={isSearchOpen}
            threads={threads}
            onOpenChange={setIsSearchOpen}
            onSelect={handleThreadSelect}
          />
          <SettingsDialog
            key={`${settingsTarget.section}-${settingsTarget.pluginTab}-${isSettingsOpen ? 'open' : 'closed'}`}
            initialPluginTab={settingsTarget.pluginTab}
            initialSection={settingsTarget.section}
            isOpen={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
          />
        </AppLayout>
      </ChatWorkspaceContext.Provider>
    </SettingsProvider>
  )
}
