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
import { WorkspaceChangesPanel } from '../features/chat/components/WorkspaceChangesPanel.tsx'
import { ChatWorkspaceContext } from '../features/chat/workspace-context.ts'
import type { ChatWorkspace } from '../features/chat/workspace-data.ts'
import { SettingsDialog } from '../features/settings/components/SettingsDialog.tsx'
import { ModelSettingsContext } from '../features/settings/model-settings-context.tsx'
import { INITIAL_PLUGIN_CONNECTORS } from '../features/settings/plugin-connectors.ts'
import {
  INITIAL_MCP_SERVERS,
  INITIAL_PLUGIN_SKILLS,
  PluginSettingsContext,
  type PluginSettingsTab,
} from '../features/settings/plugin-settings-context.tsx'
import {
  PermissionSettingsContext,
  type PermissionId,
} from '../features/settings/permission-settings-context.tsx'
import { createInitialModelProviders } from '../features/settings/provider-models.ts'

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
  const [isWorkspaceChangesOpen, setIsWorkspaceChangesOpen] = useState(false)
  const [providers, setProviders] = useState(createInitialModelProviders)
  const [permission, setPermission] =
    useState<PermissionId>('workspace-write')
  const [skills, setSkills] = useState(() => [...INITIAL_PLUGIN_SKILLS])
  const [mcpServers, setMcpServers] = useState(() => [
    ...INITIAL_MCP_SERVERS,
  ])
  const [pluginConnectors, setPluginConnectors] = useState(() =>
    INITIAL_PLUGIN_CONNECTORS.map((connector) => ({
      ...connector,
      skills: connector.skills.map((skill) => ({ ...skill })),
    })),
  )
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
    <PermissionSettingsContext.Provider value={{ permission, setPermission }}>
      <ModelSettingsContext.Provider value={{ providers, setProviders }}>
        <PluginSettingsContext.Provider
          value={{
            mcpServers,
            openPluginSettings,
            pluginConnectors,
            setMcpServers,
            setPluginConnectors,
            setSkills,
            skills,
          }}
        >
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
              className={
                isThreadPage ? 'chat-layout--thread' : undefined
              }
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
                  selectedWorkspaceId={selectedWorkspaceId}
                  workspaces={workspaces}
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
                key={`${settingsTarget.section}-${settingsTarget.pluginTab}-${isSettingsOpen ? 'open' : 'closed'}`}
                initialPluginTab={settingsTarget.pluginTab}
                initialSection={settingsTarget.section}
                isOpen={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
              />
            </AppLayout>
          </ChatWorkspaceContext.Provider>
        </PluginSettingsContext.Provider>
      </ModelSettingsContext.Provider>
    </PermissionSettingsContext.Provider>
  )
}
