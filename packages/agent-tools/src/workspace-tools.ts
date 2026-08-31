import type {
  ApprovalResolution,
  PendingToolApproval,
  ToolPermission,
} from '@devaid/agent-policy'
import { ToolPolicy, ToolPolicyError } from '@devaid/agent-policy'
import {
  createEditTool,
  createReadTool,
  createWriteTool,
  type AgentHarnessTool,
  type AgentTool,
  type BeforeToolCallContext,
  type BeforeToolCallResult,
  type ExecutionToolContext,
} from '@earendil-works/pi-agent-core'

import { WorkspaceExecutionEnv } from './workspace-execution-env.ts'

export const WORKSPACE_TOOLS_SYSTEM_PROMPT =
  'File tools are limited to workspace-relative paths. Shell and process execution are unavailable.'

interface WorkspaceToolsOptions {
  cwd: string
  onApprovalRequested(approval: PendingToolApproval): Promise<void>
  onApprovalResolved(resolution: ApprovalResolution): Promise<void>
  permission: ToolPermission
  policy: ToolPolicy
  protectedRoots?: readonly string[]
  runId: string
  sessionId: string
}

const bindTool = <TContext extends ExecutionToolContext>(
  tool: AgentHarnessTool<TContext>,
  context: TContext,
): AgentTool => ({
  ...tool,
  execute: (toolCallId, params, signal, onUpdate) =>
    tool.execute(toolCallId, params, signal, onUpdate, context),
})

const toolKind = (
  toolName: string,
):
  | { effect: 'read'; toolName: 'read' }
  | { effect: 'write'; toolName: 'edit' | 'write' }
  | undefined => {
  if (toolName === 'read') return { effect: 'read' as const, toolName }
  if (toolName === 'write' || toolName === 'edit') {
    return { effect: 'write' as const, toolName }
  }
  return undefined
}

const inputPath = (args: unknown) => {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return undefined
  const path = (args as Record<string, unknown>).path
  return typeof path === 'string' ? path : undefined
}

/** 为一次 Run 绑定受限文件环境、Policy 与 Pi 工具。 */
export const createWorkspaceTools = async (options: WorkspaceToolsOptions) => {
  const env = await WorkspaceExecutionEnv.create(
    options.cwd,
    options.protectedRoots,
  )
  const context = { env }
  const tools = [
    bindTool(createReadTool(), context),
    bindTool(createWriteTool(), context),
    bindTool(createEditTool(), context),
  ]

  const beforeToolCall = async (
    call: BeforeToolCallContext,
    signal?: AbortSignal,
  ): Promise<BeforeToolCallResult | undefined> => {
    const kind = toolKind(call.toolCall.name)
    const path = inputPath(call.args)
    if (!kind || path === undefined) {
      return { block: true, reason: '工具或参数不在允许范围内。' }
    }
    try {
      const relativePath = await env.describePath(path, kind.effect)
      await options.policy.authorize(
        {
          effect: kind.effect,
          path: relativePath,
          permission: options.permission,
          runId: options.runId,
          sessionId: options.sessionId,
          toolCallId: call.toolCall.id,
          toolName: kind.toolName,
        },
        {
          onRequested: options.onApprovalRequested,
          onResolved: options.onApprovalResolved,
        },
        signal,
      )
      return undefined
    } catch (error) {
      return {
        block: true,
        reason:
          error instanceof ToolPolicyError
            ? error.message
            : '文件路径不在当前工作区允许范围内。',
      }
    }
  }

  return { beforeToolCall, cleanup: () => env.cleanup(), tools }
}
