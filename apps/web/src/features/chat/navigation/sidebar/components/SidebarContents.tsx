import { Sidebar, useSidebar } from '@agile-avocation/ui-pro/sidebar'
import { Folder, FolderPlus, Gear, Magnifier } from '@gravity-ui/icons'
import { Button, Tooltip } from '@heroui/react'
import { CHAT_NAV_ITEMS } from '../../../data/chat-navigation.ts'
import type { ChatSidebarProps } from '../types/chat-sidebar.ts'

interface SidebarContentsProps extends Omit<
  ChatSidebarProps,
  'onWorkspaceAdd'
> {
  expandedWorkspaceIds: ReadonlySet<string>
  idPrefix?: string
  isAddingWorkspace: boolean
  onAddWorkspace: () => Promise<void>
  onWorkspaceToggle: (workspaceId: string) => void
  workspaceError: string
}

/** 复用桌面与移动导航内容，并标记当前页面或会话。 */
export function SidebarContents({
  activePage,
  expandedWorkspaceIds,
  idPrefix = '',
  isAddingWorkspace,
  onAddWorkspace,
  onSearch,
  onSettings,
  onWorkspaceSelect,
  onWorkspaceToggle,
  selectedWorkspaceId,
  threads,
  workspaceError,
  workspaces,
}: SidebarContentsProps) {
  const { isMobile, isOpen, setMobileOpen } = useSidebar()
  const isCollapsed = !isMobile && !isOpen
  const visibleNavItems = isCollapsed
    ? CHAT_NAV_ITEMS.filter((item) => item.id === 'new')
    : CHAT_NAV_ITEMS
  const handleSettings = () => {
    if (isMobile) setMobileOpen(false)
    onSettings()
  }

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
              <div className="mb-1 flex h-8 items-center justify-between pr-2 pl-2.5">
                <Sidebar.GroupLabel className="!p-0">工作区</Sidebar.GroupLabel>
                <Tooltip delay={0}>
                  <Button
                    isIconOnly
                    aria-label="添加工作区"
                    isDisabled={isAddingWorkspace}
                    size="sm"
                    variant="ghost"
                    onPress={() => void onAddWorkspace()}
                  >
                    <FolderPlus className="size-4" />
                  </Button>
                  <Tooltip.Content placement="right">
                    添加工作区
                  </Tooltip.Content>
                </Tooltip>
              </div>

              <div aria-label="工作区" className="space-y-1">
                {workspaces.map((workspace) => {
                  const workspaceThreads = threads.filter((thread) =>
                    workspace.threadIds.includes(thread.id),
                  )
                  const isExpanded = expandedWorkspaceIds.has(workspace.id)
                  const isSelected = selectedWorkspaceId === workspace.id

                  return (
                    <section key={workspace.id}>
                      <Button
                        fullWidth
                        aria-expanded={isExpanded}
                        className="h-9 min-h-9 justify-start gap-4 rounded-2xl pr-2 pl-3 font-normal"
                        size="sm"
                        variant="ghost"
                        onPress={() => onWorkspaceToggle(workspace.id)}
                      >
                        <Folder
                          className={`size-4 shrink-0 ${isSelected ? 'text-accent' : 'text-muted'}`}
                        />
                        <span className="truncate">{workspace.label}</span>
                      </Button>

                      {isExpanded ? (
                        workspaceThreads.length > 0 ? (
                          <Sidebar.Menu
                            aria-label={`${workspace.label}中的对话`}
                            className="mt-0.5 pl-5"
                            showGuideLines={false}
                          >
                            {workspaceThreads.map((thread) => (
                              <Sidebar.MenuItem
                                key={thread.id}
                                href={`/${thread.id}`}
                                id={`${idPrefix}${thread.id}`}
                                isCurrent={
                                  activePage.kind === 'thread' &&
                                  activePage.thread.id === thread.id
                                }
                                textValue={thread.title}
                                onAction={() => onWorkspaceSelect(workspace.id)}
                              >
                                <Sidebar.MenuLabel className="min-w-0">
                                  <span className="flex min-w-0 items-center justify-between gap-2">
                                    <span className="truncate">
                                      {thread.title}
                                    </span>
                                    <span className="shrink-0 text-xs text-muted">
                                      {thread.updatedAt}
                                    </span>
                                  </span>
                                </Sidebar.MenuLabel>
                              </Sidebar.MenuItem>
                            ))}
                          </Sidebar.Menu>
                        ) : (
                          <p className="py-2 pr-2 pl-7 text-xs text-muted">
                            暂无对话
                          </p>
                        )
                      ) : null}
                    </section>
                  )
                })}
              </div>

              {workspaceError ? (
                <p aria-live="polite" className="mt-2 px-2 text-xs text-danger">
                  {workspaceError}
                </p>
              ) : null}
            </Sidebar.Group>
          </>
        ) : null}
      </Sidebar.Content>

      <Sidebar.Footer>
        <Sidebar.Menu aria-label="应用设置">
          <Sidebar.MenuItem
            id={`${idPrefix}settings`}
            textValue="设置"
            onAction={handleSettings}
          >
            <Sidebar.MenuIcon>
              <Gear className="size-4" />
            </Sidebar.MenuIcon>
            <Sidebar.MenuLabel>设置</Sidebar.MenuLabel>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.Footer>
    </>
  )
}
