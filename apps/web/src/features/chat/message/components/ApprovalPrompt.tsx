import { useEffect } from 'react'
import { Button, Kbd } from '@heroui/react'
import { HandIcon } from 'lucide-react'
import type { ChatMessageTool } from '../../data/chat-types.ts'
import type { ApprovalDecision } from '../types/approval.ts'

interface ApprovalPromptProps {
  tool: ChatMessageTool
  onResolve: (decision: ApprovalDecision) => void
}

/** 在聊天底栏展示当前待处理工具的 Codex 风格权限请求。 */
export function ApprovalPrompt({ tool, onResolve }: ApprovalPromptProps) {
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
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
  }, [onResolve])

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

        <Button
          className="h-9 min-h-0 rounded-full bg-foreground px-3.5 text-sm text-background hover:bg-foreground/90"
          type="button"
          onPress={() => onResolve('approve-once')}
        >
          允许一次
          <Kbd className="ml-0.5 h-5 min-w-6 bg-background/10 px-1 text-[10px] text-background">
            <Kbd.Abbr keyValue="enter" />
          </Kbd>
        </Button>
      </div>
    </section>
  )
}
