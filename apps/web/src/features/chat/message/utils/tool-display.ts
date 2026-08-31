import type { ToolCallMessagePartStatus } from '@assistant-ui/react'
import type {
  ChatAssistantStatus,
  ChatMessageTool,
} from '../../data/chat-types.ts'

export interface ToolActivitySummary {
  label: string
  state: 'complete' | 'failed' | 'running'
}

export const isToolActivityRunning = (
  tools: readonly ChatMessageTool[],
  status?: ChatAssistantStatus,
  hasEnded = false,
) =>
  !hasEnded &&
  (status === 'streaming' ||
    tools.some(
      (tool) =>
        tool.state === 'input-streaming' ||
        tool.state === 'input-available' ||
        tool.state === 'requires-action',
    ))

/** 将 Agent Run 毫秒耗时格式化为紧凑中文。 */
export const formatToolActivityDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [
    hours ? `${hours}小时` : '',
    minutes ? `${minutes}分钟` : '',
    `${seconds}秒`,
  ]
    .filter(Boolean)
    .join(' ')
}

/** 汇总折叠工具活动的运行、完成和失败状态。 */
export const getToolActivitySummary = (
  tools: readonly ChatMessageTool[],
  status?: ChatAssistantStatus,
  hasRunError = false,
  durationMs?: number,
  hasEnded = false,
): ToolActivitySummary => {
  const durationLabel =
    durationMs === undefined
      ? undefined
      : `用时 ${formatToolActivityDuration(durationMs)}`
  const failureCount = tools.filter(
    (tool) => tool.state === 'output-error',
  ).length
  if (hasRunError || failureCount) {
    return {
      label: durationLabel ? `运行失败 · ${durationLabel}` : '工具运行失败',
      state: 'failed',
    }
  }

  const isRunning = isToolActivityRunning(tools, status, hasEnded)
  if (isRunning) {
    return { label: durationLabel ?? '正在使用工具', state: 'running' }
  }

  return {
    label: durationLabel ?? '工具活动',
    state: 'complete',
  }
}

/** 将现有工具状态投影到 assistant-ui ToolFallback 状态。 */
export const getToolStatus = (
  tool: ChatMessageTool,
): ToolCallMessagePartStatus => {
  if (tool.state === 'output-available') return { type: 'complete' }
  if (tool.state === 'output-error') {
    return {
      error: tool.errorText ?? 'Tool call failed',
      reason: 'error',
      type: 'incomplete',
    }
  }
  return { type: 'running' }
}

/** 将结构化工具输入转换为 ToolFallback 可显示的参数文本。 */
export const getToolArgsText = (tool: ChatMessageTool) => {
  if (tool.argsText !== undefined) return tool.argsText
  if (tool.input === undefined) return undefined
  try {
    return JSON.stringify(tool.input, null, 2)
  } catch {
    return String(tool.input)
  }
}
