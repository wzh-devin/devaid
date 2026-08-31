import { isToolPermission, type ApprovalDecision } from '@devaid/agent-policy'
import type { AgentRun, AgentRuntime } from '@devaid/agent-runtime'
import type { Context } from 'hono'
import { streamSSE } from 'hono/streaming'

import type {
  AgentRunEventDto,
  SendAgentMessageDto,
} from '../../dto/agent/run-dto.ts'
import { agentErrorResponse } from './error-response.ts'

function parseMessage(value: unknown): SendAgentMessageDto | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const record = value as Record<string, unknown>
  if (
    Object.keys(record).some(
      (key) => key !== 'content' && key !== 'permission',
    ) ||
    typeof record.content !== 'string' ||
    !record.content.trim() ||
    record.content.length > 1_000_000 ||
    !isToolPermission(record.permission)
  ) {
    return undefined
  }
  return { content: record.content, permission: record.permission }
}

function parseApprovalDecision(value: unknown): ApprovalDecision | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const record = value as Record<string, unknown>
  if (
    Object.keys(record).some((key) => key !== 'decision') ||
    (record.decision !== 'approve-once' && record.decision !== 'reject')
  ) {
    return undefined
  }
  return record.decision
}

function streamRun(context: Context, run: AgentRun) {
  return streamSSE(context, async (stream) => {
    stream.onAbort(run.detach)
    try {
      for await (const event of run.events) {
        const dto = event satisfies AgentRunEventDto
        await stream.writeSSE({ data: JSON.stringify(dto), event: dto.type })
      }
    } catch {
      run.detach()
    }
  })
}

/** 创建 Agent prompt、continue 与 abort Controller。 */
export function createAgentRunController(runtime: AgentRuntime) {
  return {
    abort: (context: Context) => {
      try {
        runtime.abort(context.req.param('id')!)
        return context.body(null, 204)
      } catch (error) {
        return agentErrorResponse(context, error)
      }
    },
    pendingApproval: (context: Context) => {
      try {
        const approval = runtime.pendingApproval(context.req.param('id')!)
        if (!approval) return context.body(null, 204)
        const kind = approval.toolName === 'read' ? 'read' : 'edit'
        return context.json({
          approvalId: approval.approvalId,
          kind,
          path: approval.path,
          title: `允许 AI 助手${kind === 'read' ? '读取' : '修改'} ${approval.path} 吗？`,
          toolCallId: approval.toolCallId,
          toolName: approval.toolName,
        })
      } catch (error) {
        return agentErrorResponse(context, error)
      }
    },
    continue: async (context: Context) => {
      try {
        return streamRun(
          context,
          await runtime.continue(context.req.param('id')!),
        )
      } catch (error) {
        return agentErrorResponse(context, error)
      }
    },
    prompt: async (context: Context) => {
      const body = await context.req.json<unknown>().catch(() => undefined)
      if (
        body &&
        typeof body === 'object' &&
        !Array.isArray(body) &&
        !isToolPermission((body as Record<string, unknown>).permission)
      ) {
        return context.json(
          { code: 'INVALID_AGENT_PERMISSION', message: 'Agent 权限无效。' },
          400,
        )
      }
      const input = parseMessage(body)
      if (!input) {
        return context.json(
          { code: 'INVALID_SESSION_REQUEST', message: '消息内容无效。' },
          400,
        )
      }
      try {
        return streamRun(
          context,
          await runtime.prompt(
            context.req.param('id')!,
            input.content,
            input.permission,
          ),
        )
      } catch (error) {
        return agentErrorResponse(context, error)
      }
    },
    resolveApproval: async (context: Context) => {
      const decision = parseApprovalDecision(
        await context.req.json<unknown>().catch(() => undefined),
      )
      if (!decision) {
        return context.json(
          { code: 'INVALID_APPROVAL_REQUEST', message: '审批决议无效。' },
          400,
        )
      }
      try {
        await runtime.resolveApproval(
          context.req.param('id')!,
          context.req.param('approvalId')!,
          decision,
        )
        return context.body(null, 204)
      } catch (error) {
        return agentErrorResponse(context, error)
      }
    },
  }
}
