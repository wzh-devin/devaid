import type { CSSProperties } from 'react'
import { Sidebar, useSidebar } from '@agile-avocation/ui-pro/sidebar'
import { Sheet } from '@agile-avocation/ui-pro/sheet'
import { Comment, Magnifier } from '@gravity-ui/icons'
import { Avatar, Button, Tooltip } from '@heroui/react'
import type {
  ChatActivePage,
  ChatThread,
} from '../chat-data.ts'
import { CHAT_NAV_ITEMS } from '../chat-data.ts'

interface ChatSidebarProps {
  activePage: ChatActivePage
  onSearch: () => void
  threads: readonly ChatThread[]
}

/** 渲染品牌、聊天导航和用户信息，桌面与移动侧栏共享内容。 */
export function ChatSidebar({
  activePage,
  onSearch,
  threads,
}: ChatSidebarProps) {
  const contentProps = { activePage, onSearch, threads }

  return (
    <>
      <Sidebar
        className="bg-surface-secondary"
        style={{ '--sidebar-width-collapsed': '56px' } as CSSProperties}
      >
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
  onSearch,
  threads,
}: SidebarContentsProps) {
  const { isMobile, isOpen } = useSidebar()
  const isCollapsed = !isMobile && !isOpen
  const visibleNavItems = isCollapsed
    ? CHAT_NAV_ITEMS.filter((item) => item.id === 'new')
    : CHAT_NAV_ITEMS
  const user = threads[0]?.user

  return (
    <>
      <Sidebar.Header>
        <div
          className={`flex h-11 w-full items-center gap-2 px-1 ${isCollapsed ? 'justify-center' : 'justify-between'}`}
        >
          {isCollapsed ? (
            <Tooltip delay={0}>
              <Sidebar.Trigger
                aria-label="展开侧边栏"
                style={{ marginInlineStart: 0 }}
              />
              <Tooltip.Content placement="right">展开侧边栏</Tooltip.Content>
            </Tooltip>
          ) : (
            <>
              <span className="text-xl leading-none font-semibold tracking-tight text-foreground">
                Devaid
              </span>
              <div className="flex items-center gap-2">
                <Button
                  isIconOnly
                  aria-label="搜索对话"
                  size="sm"
                  variant="ghost"
                  onPress={onSearch}
                >
                  <Magnifier className="size-4" />
                </Button>
                <Sidebar.Trigger
                  aria-label="收起侧边栏"
                  style={{ marginInlineStart: 0 }}
                />
              </div>
            </>
          )}
        </div>
      </Sidebar.Header>

      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.Menu
            aria-label={isCollapsed ? '快捷操作' : '对话操作'}
            style={isCollapsed ? { gap: '0.75rem' } : undefined}
          >
            {visibleNavItems.map((item) => {
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
            {isCollapsed ? (
              <Sidebar.MenuItem
                id={`${idPrefix}search`}
                textValue="搜索对话"
                onAction={onSearch}
              >
                <Sidebar.MenuIcon>
                  <Magnifier className="size-4" />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>搜索对话</Sidebar.MenuLabel>
              </Sidebar.MenuItem>
            ) : null}
          </Sidebar.Menu>
        </Sidebar.Group>

        {!isCollapsed ? (
          <>
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
          </>
        ) : null}
      </Sidebar.Content>

      <Sidebar.Footer>
        <div className="flex items-center gap-3 px-1 py-1">
          <Avatar className="size-9 shrink-0">
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
      </Sidebar.Footer>
    </>
  )
}
