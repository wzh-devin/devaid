import { AppLayout } from '@agile-avocation/ui-pro/app-layout'
import { Navbar } from '@agile-avocation/ui-pro/navbar'
import { Sidebar } from '@agile-avocation/ui-pro/sidebar'
import { Magnifier } from '@gravity-ui/icons'
import { Button, Kbd, Tooltip } from '@heroui/react'

interface ChatNavbarProps {
  onSearch: () => void
}

/** 展示当前页面标题，并提供全局聊天搜索入口。 */
export function ChatNavbar({ onSearch }: ChatNavbarProps) {
  return (
    <Navbar maxWidth="full">
      <Navbar.Header>
        <AppLayout.MenuToggle />
        <Sidebar.Trigger />
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
            New Chat
          </h1>
          <span className="truncate text-xs text-muted">
            Start a brand new conversation
          </span>
        </div>
        <Navbar.Spacer />
        <Tooltip delay={0}>
          <Button
            aria-label="Search chats"
            size="sm"
            variant="tertiary"
            onPress={onSearch}
          >
            <Magnifier className="size-4" />
            <span className="hidden sm:inline">Search</span>
          </Button>
          <Tooltip.Content placement="bottom">
            <div className="flex items-center gap-2 text-xs">
              <span>Search chats</span>
              <Kbd className="text-[10px]">⌘K</Kbd>
            </div>
          </Tooltip.Content>
        </Tooltip>
      </Navbar.Header>
    </Navbar>
  )
}
