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
  WorkspaceFilePreview,
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
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<{
    path: string
    workspaceId: string
  }>()
  const [settingsTarget, setSettingsTarget] = useState<{
    pluginTab: PluginSettingsTab
    section: 'general' | 'plugins'
  }>({ pluginTab: 'skills', section: 'general' })
  const isThreadPage = activePage.kind === 'thread'
  const activePageId = isThreadPage ? activePage.thread.id : activePage.kind
  const activeWorkspaceId = isThreadPage
    ? activePage.thread.workspaceId
    : undefined

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

  const handleFileOpen = useCallback(
    (path: string) => {
      if (!activeWorkspaceId) return
      setSelectedFile({ path, workspaceId: activeWorkspaceId })
      setIsFilePreviewOpen(true)
    },
    [activeWorkspaceId],
  )

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- Thread 变化必须清除上一个工作区的文件选择。
    setSelectedFile(undefined)
  }, [activePageId])

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
    <SettingsProvider
      selectedWorkspaceId={selectedWorkspaceId}
      onOpenPluginSettings={openPluginSettings}
    >
      <ChatWorkspaceContext.Provider
        value={{
          onFileOpen: activeWorkspaceId ? handleFileOpen : undefined,
          onWorkspaceSelect,
          selectedWorkspaceId,
          workspaces,
        }}
      >
        <AppLayout
          aside={
            isThreadPage &&
            selectedFile &&
            selectedFile.workspaceId === activeWorkspaceId ? (
              <WorkspaceFilePreview
                key={`${selectedFile.workspaceId}:${selectedFile.path}`}
                path={selectedFile.path}
                workspaceId={selectedFile.workspaceId}
              />
            ) : undefined
          }
          asideDefaultSize="420px"
          asideMaxSize="50%"
          asideMinSize="360px"
          asideMobile="sheet"
          asideOpen={isThreadPage && isFilePreviewOpen}
          asideResizable={isThreadPage && Boolean(selectedFile)}
          className={
            isThreadPage
              ? `chat-layout--thread${isFilePreviewOpen ? ' chat-layout--file-preview-open' : ''}`
              : undefined
          }
          key={isThreadPage ? 'thread-layout' : 'standard-layout'}
          navigate={onNavigate}
          sidebarCollapsible="icon"
          onAsideOpenChange={setIsFilePreviewOpen}
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
