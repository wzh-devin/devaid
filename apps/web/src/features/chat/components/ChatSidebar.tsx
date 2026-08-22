import { Sidebar } from '@agile-avocation/ui-pro/sidebar'
import { Sheet } from '@agile-avocation/ui-pro/sheet'
import { Comment } from '@gravity-ui/icons'
import { Avatar } from '@heroui/react'
import type {
  ChatActivePage,
  ChatThread,
} from '../chat-data.ts'
import { CHAT_NAV_ITEMS } from '../chat-data.ts'

interface ChatSidebarProps {
  activePage: ChatActivePage
  threads: readonly ChatThread[]
}

/** 渲染聊天导航和最近会话，桌面与移动侧栏共享同一份内容。 */
export function ChatSidebar({
  activePage,
  threads,
}: ChatSidebarProps) {
  const contentProps = { activePage, threads }

  return (
    <>
      <Sidebar>
        <SidebarContents {...contentProps} />
        <Sidebar.Rail aria-label="切换侧边栏" />
      </Sidebar>
      <Sidebar.Mobile>
        <Sheet.Heading className="sr-only">导航</Sheet.Heading>
        <SidebarContents {...contentProps} idPrefix="mobile-" />
      </Sidebar.Mobile>
    </>
  )
}

interface SidebarContentsProps extends ChatSidebarProps {
  idPrefix?: string
}

/** 复用同一导航内容，并根据当前页面标记主入口或最近会话。 */
function SidebarContents({
  activePage,
  idPrefix = '',
  threads,
}: SidebarContentsProps) {
  const user = threads[0]?.user

  return (
    <>
      <Sidebar.Header>
        <div className="flex items-center gap-3 px-1 py-1">
          <Avatar className="size-9">
            <Avatar.Image alt={user?.name ?? '用户'} src={user?.avatar} />
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
          <Sidebar.Menu aria-label="对话操作">
            {CHAT_NAV_ITEMS.map((item) => {
              const Icon = item.icon

              return (
                <Sidebar.MenuItem
                  key={item.id}
                  href={item.href}
                  id={`${idPrefix}${item.id}`}
                  isCurrent={activePage.kind === item.id}
                  textValue={item.label}
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
          <Sidebar.GroupLabel>最近对话</Sidebar.GroupLabel>
          <Sidebar.Menu aria-label="最近对话">
            {threads.map((thread) => (
              <Sidebar.MenuItem
                key={thread.id}
                href={`/${thread.id}`}
                id={`${idPrefix}${thread.id}`}
                isCurrent={
                  activePage.kind === 'thread' &&
                  activePage.thread.id === thread.id
                }
                textValue={thread.title}
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
