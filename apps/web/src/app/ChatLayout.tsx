import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { AppLayout } from '@agile-avocation/ui-pro/app-layout'
import type { ChatNavItemId, ChatThread } from '../features/chat/chat-data.ts'
import { CHAT_THREADS } from '../features/chat/chat-data.ts'
import { ChatNavbar } from '../features/chat/components/ChatNavbar.tsx'
import { ChatSearchDialog } from '../features/chat/components/ChatSearchDialog.tsx'
import { ChatSidebar } from '../features/chat/components/ChatSidebar.tsx'

interface ChatLayoutProps {
  children: ReactNode
}

/** 组合聊天应用外壳，并统一管理搜索弹窗与全局快捷键。 */
export function ChatLayout({ children }: ChatLayoutProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const handleNavAction = useCallback((id: ChatNavItemId) => {
    if (id === 'new' && window.location.pathname !== '/new') {
      window.history.pushState({}, '', '/new')
    }
  }, [])

  const handleThreadSelect = useCallback((_thread: ChatThread) => {
    setIsSearchOpen(false)
  }, [])

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
      sidebarCollapsible="offcanvas"
      navbar={<ChatNavbar onSearch={() => setIsSearchOpen(true)} />}
      sidebar={
        <ChatSidebar
          threads={CHAT_THREADS}
          onAction={handleNavAction}
          onThreadSelect={handleThreadSelect}
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
