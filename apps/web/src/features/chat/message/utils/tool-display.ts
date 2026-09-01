import type { ToolCallMessagePartStatus } from '@assistant-ui/react'
import type {
  ChatAssistantStatus,
  ChatMessageTool,
} from '../../data/chat-types.ts'

export interface ToolActivitySummary {
  label: string
  state: 'complete' | 'failed' | 'running'
}

interface ToolApprovalPresentation {
  label: string
  question: string
  target?: string
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

/** 从未知工具输入中读取一个字段，不信任跨边界参数形状。 */
const inputField = (input: unknown, key: string) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return
  return (input as Record<string, unknown>)[key]
}

/** 为审批界面保留命令参数边界，避免含空格或引号的参数产生歧义。 */
const formatCommandToken = (token: string) =>
  /^[A-Za-z0-9_@%+=:,./-]+$/u.test(token) ? token : JSON.stringify(token)

/** 将待审批工具转换为用户可直接核对的操作、问题与目标。 */
export const getToolApprovalPresentation = (
  tool: ChatMessageTool,
): ToolApprovalPresentation => {
  if (tool.kind === 'command') {
    const program = inputField(tool.input, 'program')
    const args = inputField(tool.input, 'args')
    const command =
      typeof program === 'string' &&
      Array.isArray(args) &&
      args.every((arg): arg is string => typeof arg === 'string')
        ? [program, ...args].map(formatCommandToken).join(' ')
        : ''

    return {
      label: '运行命令',
      question: '是否允许 Devaid 运行以下命令？',
      target: command || tool.approval?.description,
    }
  }

  if (tool.kind === 'edit' || tool.kind === 'read') {
    const path = inputField(tool.input, 'path')
    const isRead = tool.kind === 'read'
    return {
      label: isRead ? '读取文件' : '编辑文件',
      question: `是否允许 Devaid ${isRead ? '读取' : '编辑'}以下文件？`,
      target: typeof path === 'string' ? path : tool.approval?.description,
    }
  }

  return {
    label: '权限',
    question: tool.approval?.title ?? `允许 AI 助手使用 ${tool.toolName} 吗？`,
    target: tool.approval?.description,
  }
}
