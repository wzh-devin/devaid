import type { ElementType } from 'react'
import {
  FileTextIcon,
  Globe2Icon,
  PencilIcon,
  SearchIcon,
  SparklesIcon,
  TerminalIcon,
  WrenchIcon,
} from 'lucide-react'
import {
  ToolFallbackArgs,
  ToolFallbackContent,
  ToolFallbackError,
  ToolFallbackResult,
  ToolFallbackRoot,
  ToolFallbackTrigger,
} from '../../../../components/assistant-ui/index.ts'
import type { ChatMessageTool } from '../../data/chat-types.ts'
import { getToolArgsText, getToolStatus } from '../utils/tool-display.ts'

const TOOL_ICONS: Record<NonNullable<ChatMessageTool['kind']>, ElementType> = {
  browser: Globe2Icon,
  command: TerminalIcon,
  edit: PencilIcon,
  read: FileTextIcon,
  search: SearchIcon,
  skill: SparklesIcon,
  tool: WrenchIcon,
}

interface MessageToolProps {
  tool: ChatMessageTool
}

/** 展示普通工具调用或待审批工具状态。 */
export function MessageTool({ tool }: MessageToolProps) {
  if (tool.state === 'requires-action') {
    return (
      <div className="flex min-h-7 items-center gap-2 text-sm text-muted">
        <WrenchIcon className="size-4 shrink-0" />
        <span>等待审批 · {tool.label ?? tool.toolName}</span>
      </div>
    )
  }

  const status = getToolStatus(tool)
  return (
    <ToolFallbackRoot defaultOpen={status.type === 'running'}>
      <ToolFallbackTrigger
        icon={TOOL_ICONS[tool.kind ?? 'tool']}
        label={tool.label}
        status={status}
        toolName={tool.toolName}
      />
      <ToolFallbackContent>
        <ToolFallbackError status={status} />
        <ToolFallbackArgs argsText={getToolArgsText(tool)} />
        <ToolFallbackResult result={tool.output} />
      </ToolFallbackContent>
    </ToolFallbackRoot>
  )
}
