import { Sidebar } from '@agile-avocation/ui-pro/sidebar'
import { Sheet } from '@agile-avocation/ui-pro/sheet'
import { Comment } from '@gravity-ui/icons'
import { Avatar } from '@heroui/react'
import type { ChatNavItemId, ChatThread } from '../chat-data.ts'
import { CHAT_NAV_ITEMS } from '../chat-data.ts'

interface ChatSidebarProps {
  threads: readonly ChatThread[]
  onAction: (id: ChatNavItemId) => void
  onThreadSelect: (thread: ChatThread) => void
}

/** 渲染聊天导航和最近会话，桌面与移动侧栏共享同一份内容。 */
export function ChatSidebar({
  onAction,
  onThreadSelect,
  threads,
}: ChatSidebarProps) {
  const contentProps = { onAction, onThreadSelect, threads }

  return (
    <>
      <Sidebar>
        <SidebarContents {...contentProps} />
        <Sidebar.Rail />
      </Sidebar>
      <Sidebar.Mobile>
        <Sheet.Heading className="sr-only">Navigation</Sheet.Heading>
        <SidebarContents {...contentProps} idPrefix="mobile-" />
      </Sidebar.Mobile>
    </>
  )
}

interface SidebarContentsProps extends ChatSidebarProps {
  idPrefix?: string
}

function SidebarContents({
  idPrefix = '',
  onAction,
  onThreadSelect,
  threads,
}: SidebarContentsProps) {
  const user = threads[0]?.user

  return (
    <>
      <Sidebar.Header>
        <div className="flex items-center gap-3 px-1 py-1">
          <Avatar className="size-9">
            <Avatar.Image alt={user?.name ?? 'User'} src={user?.avatar} />
            <Avatar.Fallback>DH</Avatar.Fallback>
          </Avatar>
          <div className="flex min-w-0 flex-col" data-sidebar="label">
            <span className="text-sm leading-tight font-medium text-foreground">
              {user?.name ?? 'Darnell Howe'}
            </span>
            <span className="text-xs leading-tight font-medium text-muted">
              {user?.email ?? 'darnell@email.com'}
            </span>
          </div>
        </div>
      </Sidebar.Header>

      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.Menu aria-label="Chat actions">
            {CHAT_NAV_ITEMS.map((item) => {
              const Icon = item.icon

              return (
                <Sidebar.MenuItem
                  key={item.id}
                  id={`${idPrefix}${item.id}`}
                  isCurrent={item.id === 'new'}
                  textValue={item.label}
                  onPress={() => onAction(item.id)}
                >
                  <Sidebar.MenuIcon>
                    <Icon className="size-4" />
                  </Sidebar.MenuIcon>
                  <Sidebar.MenuLabel>{item.label}</Sidebar.MenuLabel>
                </Sidebar.MenuItem>
              )
            })}
          </Sidebar.Menu>
        </Sidebar.Group>

        <Sidebar.Separator />

        <Sidebar.Group>
          <Sidebar.GroupLabel>Recent</Sidebar.GroupLabel>
          <Sidebar.Menu aria-label="Recent chats">
            {threads.map((thread) => (
              <Sidebar.MenuItem
                key={thread.id}
                id={`${idPrefix}${thread.id}`}
                textValue={thread.title}
                onPress={() => onThreadSelect(thread)}
              >
                <Sidebar.MenuIcon>
                  <Comment className="size-4" />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>{thread.title}</Sidebar.MenuLabel>
              </Sidebar.MenuItem>
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
      </Sidebar.Content>
    </>
  )
}
