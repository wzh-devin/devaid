import type { ToolCallMessagePartStatus } from '@assistant-ui/react'
import type { ChatMessage, ChatMessageTool } from '../data/chat-types.ts'

export interface PendingToolApproval {
  key: string
  tool: ChatMessageTool
}

/** 返回尚未在当前前端演示中处理的首个待审批工具。 */
export const findPendingToolApproval = (
  messages: readonly ChatMessage[],
  resolvedKeys: readonly string[],
  approvedToolNames: readonly string[] = [],
): PendingToolApproval | undefined => {
  for (const message of messages) {
    const toolIndex = message.tools?.findIndex(
      (tool, index) =>
        tool.state === 'requires-action' &&
        !resolvedKeys.includes(`${message.id}:${index}`) &&
        !approvedToolNames.includes(tool.toolName),
    )

    if (toolIndex !== undefined && toolIndex >= 0) {
      return {
        key: `${message.id}:${toolIndex}`,
        tool: message.tools![toolIndex],
      }
    }
  }

  return undefined
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
