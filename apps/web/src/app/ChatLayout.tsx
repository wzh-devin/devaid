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

interface ChatLayoutProps {
  activePage: ChatActivePage
  children: ReactNode
  onNavigate: (path: string, draft?: string) => void
}

/** 组合聊天应用外壳，并统一管理搜索弹窗与全局快捷键。 */
export function ChatLayout({
  activePage,
  children,
  onNavigate,
}: ChatLayoutProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

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
          onSearch={() => setIsSearchOpen(true)}
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
    </AppLayout>
  )
}
