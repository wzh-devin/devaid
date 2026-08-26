import { useEffect, useState } from 'react'
import { ChevronDown } from '@gravity-ui/icons'
import { Button, Dropdown, Kbd } from '@heroui/react'
import { HandIcon } from 'lucide-react'
import type { ChatMessageTool } from '../data/chat-types.ts'

export type ApprovalDecision = 'approve-once' | 'approve-thread' | 'reject'

interface ApprovalPromptProps {
  tool: ChatMessageTool
  onResolve: (decision: ApprovalDecision) => void
}

/** 在聊天底栏展示当前待处理工具的 Codex 风格权限请求。 */
export function ApprovalPrompt({ tool, onResolve }: ApprovalPromptProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (isMenuOpen) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onResolve('reject')
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        onResolve('approve-once')
      }
    }

    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [isMenuOpen, onResolve])

  const title = tool.approval?.title ?? `允许 AI 助手使用 ${tool.toolName} 吗？`

  return (
    <section
      aria-labelledby="tool-approval-title"
      className="rounded-3xl border border-divider bg-surface px-5 py-5 shadow-[0_12px_36px_rgba(0,0,0,0.08)] sm:px-7 sm:py-6"
    >
      <div className="flex items-center gap-2 text-sm text-muted">
        <HandIcon className="size-4" />
        <span>权限</span>
      </div>

      <div className="mt-4">
        <h2
          className="text-base font-semibold text-foreground sm:text-lg"
          id="tool-approval-title"
        >
          {title}
        </h2>
        {tool.approval?.description ? (
          <p className="mt-1 text-sm leading-6 text-muted">
            {tool.approval.description}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        <Button
          className="h-9 min-h-0 rounded-full px-3.5 text-sm"
          type="button"
          variant="outline"
          onPress={() => onResolve('reject')}
        >
          拒绝
          <Kbd className="ml-0.5 h-5 min-w-7 px-1 text-[10px]">Esc</Kbd>
        </Button>

        <div className="flex overflow-hidden rounded-full bg-foreground text-background">
          <Button
            className="h-9 min-h-0 rounded-none bg-transparent px-3.5 text-sm text-background hover:bg-background/10"
            type="button"
            onPress={() => onResolve('approve-once')}
          >
            允许一次
            <Kbd className="ml-0.5 h-5 min-w-6 bg-background/10 px-1 text-[10px] text-background">
              <Kbd.Abbr keyValue="enter" />
            </Kbd>
          </Button>
          <Dropdown isOpen={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <Dropdown.Trigger
              aria-label="选择授权范围"
              className="flex size-9 min-h-0 min-w-9 items-center justify-center rounded-none border-l border-background/20 bg-transparent p-0 text-background hover:bg-background/10"
            >
              <ChevronDown className="size-3.5" />
            </Dropdown.Trigger>
            <Dropdown.Popover className="w-40 min-w-40" placement="top end">
              <Dropdown.Menu
                aria-label="授权范围"
                onAction={(key) => onResolve(String(key) as ApprovalDecision)}
              >
                <Dropdown.Item
                  className="min-h-9 py-1 text-sm"
                  id="approve-once"
                  textValue="允许一次"
                >
                  允许一次
                </Dropdown.Item>
                <Dropdown.Item
                  className="min-h-9 py-1 text-sm"
                  id="approve-thread"
                  textValue="允许此对话"
                >
                  允许此对话
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>
    </section>
  )
}
