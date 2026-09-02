import type {
  ApprovalResolution,
  PendingToolApproval,
  ToolPermission,
} from '@devaid/agent-policy'
import { ToolPolicy, ToolPolicyError } from '@devaid/agent-policy'
import {
  type AgentHarnessTool,
  type AgentTool,
  type BeforeToolCallContext,
  type BeforeToolCallResult,
  type ExecutionToolContext,
} from '@earendil-works/pi-agent-core'

import { createBashTool, parseBashInput } from '../tools/bash.ts'
import { createEditTool } from '../tools/edit.ts'
import { createReadTool } from '../tools/read.ts'
import { createWriteTool } from '../tools/write.ts'
import { WorkspaceExecutionEnv } from './execution-env.ts'

export const WORKSPACE_TOOLS_SYSTEM_PROMPT =
  'File tools are limited to workspace-relative paths. The bash tool runs a complete Bash command from the workspace only after user approval. Put the full command in command, including pipes or redirections when needed, and inspect its exit marker before continuing.'

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
  | { effect: 'execute'; toolName: 'bash' }
  | { effect: 'read'; toolName: 'read' }
  | { effect: 'write'; toolName: 'edit' | 'write' }
  | undefined => {
  if (toolName === 'bash') return { effect: 'execute', toolName }
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
    createBashTool(env.cwd),
  ]

  const beforeToolCall = async (
    call: BeforeToolCallContext,
    signal?: AbortSignal,
  ): Promise<BeforeToolCallResult | undefined> => {
    const kind = toolKind(call.toolCall.name)
    if (!kind) {
      return { block: true, reason: '工具或参数不在允许范围内。' }
    }
    try {
      if (kind.effect === 'execute') {
        const { command } = parseBashInput(call.args)
        await options.policy.authorize(
          {
            command,
            effect: 'execute',
            permission: options.permission,
            runId: options.runId,
            sessionId: options.sessionId,
            toolCallId: call.toolCall.id,
            toolName: 'bash',
          },
          {
            onRequested: options.onApprovalRequested,
            onResolved: options.onApprovalResolved,
          },
          signal,
        )
        return undefined
      }
      const path = inputPath(call.args)
      if (path === undefined) {
        return { block: true, reason: '工具或参数不在允许范围内。' }
      }
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
            : kind.effect === 'execute'
              ? error instanceof Error
                ? error.message
                : '命令参数不在允许范围内。'
              : '文件路径不在当前工作区允许范围内。',
      }
    }
  }

  return { beforeToolCall, cleanup: () => env.cleanup(), tools }
}
