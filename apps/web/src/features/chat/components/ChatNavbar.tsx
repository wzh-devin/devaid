import { AppLayout } from '@agile-avocation/ui-pro/app-layout'
import { Navbar } from '@agile-avocation/ui-pro/navbar'
import { ArrowRightToSquare, Magnifier } from '@gravity-ui/icons'
import { Button, Kbd, Tooltip } from '@heroui/react'
import type { ChatActivePage } from '../chat-data.ts'

const NAV_TITLES: Record<
  Exclude<ChatActivePage['kind'], 'thread'>,
  { subtitle: string; title: string }
> = {
  explore: {
    subtitle: '通过常用提示词探索模板能力',
    title: '探索',
  },
  library: {
    subtitle: '已保存的提示词、语气预设和可复用对话',
    title: '资料库',
  },
  new: { subtitle: '开始一段全新的对话', title: '新建对话' },
}

interface ChatNavbarProps {
  activePage: ChatActivePage
  onSearch: () => void
}

/** 展示当前页面标题，并提供全局聊天搜索入口。 */
export function ChatNavbar({ activePage, onSearch }: ChatNavbarProps) {
  const isThread = activePage.kind === 'thread'
  const title = isThread
    ? activePage.thread.title
    : NAV_TITLES[activePage.kind].title
  const subtitle = isThread
    ? `更新于${activePage.thread.updatedAt}`
    : NAV_TITLES[activePage.kind].subtitle

  return (
    <Navbar maxWidth="full">
      <Navbar.Header>
        <AppLayout.MenuToggle aria-label="打开导航" />
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
            {title}
          </h1>
          <span className="truncate text-xs text-muted">{subtitle}</span>
        </div>
        <Navbar.Spacer />
        <div className="flex items-center gap-2">
          <Tooltip delay={0}>
            <Button
              aria-label="搜索对话"
              className="md:hidden"
              size="sm"
              variant="tertiary"
              onPress={onSearch}
            >
              <Magnifier className="size-4" />
              <span className="hidden sm:inline">搜索</span>
            </Button>
            <Tooltip.Content placement="bottom">
              <div className="flex items-center gap-2 text-xs">
                <span>搜索对话</span>
                <Kbd className="text-[10px]">⌘K</Kbd>
              </div>
            </Tooltip.Content>
          </Tooltip>
          {isThread ? (
            <Button className="hidden md:inline-flex" size="sm">
              <ArrowRightToSquare className="size-4" />
              分享
            </Button>
          ) : null}
        </div>
      </Navbar.Header>
    </Navbar>
  )
}
