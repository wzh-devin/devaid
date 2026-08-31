import { randomUUID } from 'node:crypto'
import { isAbsolute } from 'node:path'

import {
  ToolPolicy,
  ToolPolicyError,
  type ApprovalDecision,
  type ApprovalResolution,
  type PendingToolApproval,
  type ToolPermission,
} from '@devaid/agent-policy'
import {
  createWorkspaceTools,
  WORKSPACE_TOOLS_SYSTEM_PROMPT,
} from '@devaid/agent-tools'
import { ModelServiceError, type ModelService } from '@devaid/llm'
import {
  Agent,
  buildSessionContext,
  type AgentEvent,
  type AgentMessage,
} from '@earendil-works/pi-agent-core'
import {
  EventStream,
  type AssistantMessage,
  type UserMessage,
} from '@earendil-works/pi-ai'

import { compactSessionIfNeeded } from '../compaction/session-compaction.ts'
import { AgentRuntimeError } from '../error/agent-runtime-error.ts'
import type { AgentRun, AgentRuntimeEvent } from '../execution/runtime-event.ts'
import {
  AgentSessionService,
  type AgentSessionProjection,
  type AgentSessionRepository,
} from '../session/session-service.ts'

interface ActiveOperation {
  agent?: Agent
  controller: AbortController
  finish(): void
  kind: 'mutation' | 'run'
  settled: Promise<void>
}

interface AgentRuntimeToolOptions {
  policy: ToolPolicy
  protectedRoots?: readonly string[]
}

function createUserMessage(content: string): UserMessage {
  return {
    content: [{ text: content, type: 'text' }],
    role: 'user',
    timestamp: Date.now(),
  }
}

function toDurableMessage(message: AgentMessage, aborted: boolean) {
  // Pi Agent 0.84.3 会保留可选 undefined 字段，而 Session payload 只接受 JSON 值。
  const durable = JSON.parse(JSON.stringify(message)) as AgentMessage
  if (durable.role === 'assistant' && aborted) {
    durable.stopReason = 'aborted'
    delete durable.errorMessage
  }
  return durable
}

function runtimeEventError(
  error: unknown,
): Extract<AgentRuntimeEvent, { type: 'error' }> {
  if (error instanceof AgentRuntimeError) {
    return { code: error.code, message: error.message, type: 'error' }
  }
  return {
    code: 'AGENT_RUN_FAILED',
    message: 'Agent 运行失败。',
    type: 'error',
  }
}

function safeToolInput(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const path = (input as Record<string, unknown>).path
  if (
    typeof path !== 'string' ||
    path.includes('\0') ||
    path.split(/[\\/]/u).includes('..') ||
    isAbsolute(path) ||
    path === '~' ||
    path.startsWith('~/') ||
    path.startsWith('file:')
  ) {
    return typeof path === 'string' ? { path: '[blocked path]' } : {}
  }
  return { path }
}

/** 协调 Pi Agent 与 Session 生命周期。 */
export class AgentRuntime {
  private readonly active = new Map<string, ActiveOperation>()
  private readonly models: ModelService
  private readonly sessions: AgentSessionService
  private readonly toolOptions?: AgentRuntimeToolOptions
  private closed = false

  constructor(
    models: ModelService,
    repository: AgentSessionRepository,
    projection?: AgentSessionProjection,
    toolOptions?: AgentRuntimeToolOptions,
  ) {
    this.models = models
    this.sessions = new AgentSessionService(repository, projection)
    this.toolOptions = toolOptions
  }

  async createSession(input: {
    cwd: string
    modelId: string
    name?: string
    providerId: string
  }) {
    this.assertOpen()
    await this.models.resolveModel(input.providerId, input.modelId)
    return this.sessions.create(input)
  }

  async listSessions() {
    this.assertOpen()
    return this.sessions.list()
  }

  async getSession(id: string) {
    this.assertOpen()
    return this.sessions.get(id)
  }

  async renameSession(id: string, name: string | undefined) {
    this.assertOpen()
    const operation = this.reserve(id, 'mutation')
    try {
      return await this.sessions.rename(id, name)
    } finally {
      this.release(id, operation)
    }
  }

  async updateSessionModel(
    id: string,
    input: { modelId: string; providerId: string },
  ) {
    this.assertOpen()
    const operation = this.reserve(id, 'mutation')
    try {
      await this.models.resolveModel(input.providerId, input.modelId)
      return await this.sessions.updateModel(id, input)
    } finally {
      this.release(id, operation)
    }
  }

  async getMessages(id: string, options: { before?: number; limit: number }) {
    this.assertOpen()
    if (!this.active.has(id)) {
      const opened = await this.sessions.open(id)
      await this.repairInterruptedTools(opened.session, opened.entries, id)
    }
    return this.sessions.messages(id, options)
  }

  async deleteSession(id: string) {
    this.assertOpen()
    const operation = this.reserve(id, 'mutation')
    try {
      await this.sessions.delete(id)
    } finally {
      this.release(id, operation)
    }
  }

  prompt(
    id: string,
    content: string,
    permission: ToolPermission = 'read-only',
  ) {
    return this.startRun(id, permission, createUserMessage(content))
  }

  continue(id: string, permission: ToolPermission = 'read-only') {
    return this.startRun(id, permission)
  }

  pendingApproval(id: string) {
    this.assertOpen()
    return this.toolOptions?.policy.pendingForSession(id)[0]
  }

  async resolveApproval(
    id: string,
    approvalId: string,
    decision: ApprovalDecision,
  ) {
    this.assertOpen()
    if (!this.toolOptions) {
      throw new AgentRuntimeError(
        'APPROVAL_NOT_FOUND',
        '待审批工具调用不存在。',
        404,
      )
    }
    try {
      await this.toolOptions.policy.resolveApproval(id, approvalId, decision)
    } catch (error) {
      if (error instanceof ToolPolicyError) {
        const status =
          error.code === 'APPROVAL_NOT_FOUND'
            ? 404
            : error.code === 'APPROVAL_ALREADY_RESOLVED'
              ? 409
              : 500
        throw new AgentRuntimeError(error.code, error.message, status)
      }
      throw error
    }
  }

  abort(id: string) {
    this.assertOpen()
    const operation = this.active.get(id)
    if (!operation || operation.kind !== 'run') {
      throw new AgentRuntimeError(
        'NO_ACTIVE_RUN',
        '当前会话没有正在运行的任务。',
        409,
      )
    }
    operation.controller.abort()
    operation.agent?.abort()
  }

  async close() {
    if (this.closed) return
    this.closed = true
    const operations = [...this.active.values()]
    for (const operation of operations) {
      operation.controller.abort()
      operation.agent?.abort()
    }
    await Promise.allSettled(operations.map((operation) => operation.settled))
  }

  private async startRun(
    id: string,
    permission: ToolPermission,
    incoming?: UserMessage,
  ): Promise<AgentRun> {
    this.assertOpen()
    const operation = this.reserve(id, 'run')
    try {
      const opened = await this.sessions.open(id)
      operation.controller.signal.throwIfAborted()
      const model = await this.models.resolveModel(
        opened.config.providerId,
        opened.config.modelId,
      )
      operation.controller.signal.throwIfAborted()
      let entries = await this.repairInterruptedTools(
        opened.session,
        opened.entries,
        id,
      )
      try {
        entries = await compactSessionIfNeeded({
          entries,
          ...(incoming ? { incoming } : {}),
          model,
          models: this.models.models,
          session: opened.session,
          signal: operation.controller.signal,
        })
      } catch (error) {
        await this.sessions.changed(id)
        throw error
      }
      if (entries !== opened.entries) await this.sessions.changed(id)
      const context = buildSessionContext(entries)
      if (!incoming) {
        const last = context.messages.at(-1)
        if (!last || (last.role !== 'user' && last.role !== 'toolResult')) {
          throw new AgentRuntimeError(
            'NOTHING_TO_CONTINUE',
            '当前会话没有可继续的用户消息。',
            409,
          )
        }
      }
      operation.controller.signal.throwIfAborted()

      const events = new EventStream<AgentRuntimeEvent, void>(
        (event) => event.type === 'done' || event.type === 'error',
        () => undefined,
      )
      const runId = randomUUID()
      const workspaceTools = this.toolOptions
        ? await createWorkspaceTools({
            cwd: opened.metadata.cwd,
            onApprovalRequested: async (approval) => {
              await this.appendApprovalRequested(opened.session, approval)
              events.push(this.approvalEvent(approval))
            },
            onApprovalResolved: (resolution) =>
              this.appendApprovalResolved(opened.session, resolution),
            permission,
            policy: this.toolOptions.policy,
            protectedRoots: this.toolOptions.protectedRoots,
            runId,
            sessionId: id,
          })
        : undefined
      if (workspaceTools) {
        await opened.session.appendCustomEntry('devaid_policy_run', {
          activeToolNames: workspaceTools.tools.map((tool) => tool.name),
          permission,
          runId,
        })
      }
      const agent = new Agent({
        beforeToolCall: workspaceTools?.beforeToolCall,
        initialState: {
          messages: context.messages,
          model,
          systemPrompt: workspaceTools ? WORKSPACE_TOOLS_SYSTEM_PROMPT : '',
          thinkingLevel: 'off',
          tools: workspaceTools?.tools ?? [],
        },
        sessionId: id,
        streamFn: (streamModel, streamContext, options) =>
          this.models.models.streamSimple(streamModel, streamContext, options),
        toolExecution: 'sequential',
      })
      operation.agent = agent
      void this.executeRun({
        agent,
        cleanupTools: workspaceTools
          ? async () => {
              await workspaceTools.cleanup()
              this.toolOptions?.policy.clearRun(runId)
            }
          : undefined,
        events,
        ...(incoming ? { incoming } : {}),
        operation,
        session: opened.session,
        sessionId: id,
      }).finally(() => this.release(id, operation))
      return { detach: () => events.end(), events }
    } catch (error) {
      this.release(id, operation)
      if (
        error instanceof AgentRuntimeError ||
        error instanceof ModelServiceError
      ) {
        throw error
      }
      if (operation.controller.signal.aborted) {
        throw new AgentRuntimeError('AGENT_RUN_ABORTED', '运行已终止。', 409)
      }
      throw new AgentRuntimeError(
        'AGENT_RUN_SETUP_FAILED',
        'Agent 运行初始化失败。',
        500,
      )
    }
  }

  private async executeRun(options: {
    agent: Agent
    cleanupTools?: () => Promise<void>
    events: EventStream<AgentRuntimeEvent, void>
    incoming?: AgentMessage
    operation: ActiveOperation
    session: Awaited<ReturnType<AgentSessionService['open']>>['session']
    sessionId: string
  }) {
    let finalEntryId: string | undefined
    let finalMessage: AssistantMessage | undefined
    let projected = false
    let persisted = false
    let persistenceError: unknown

    options.agent.subscribe(async (event) => {
      if (event.type !== 'message_end') return
      if (persistenceError) throw persistenceError
      try {
        const durableMessage = toDurableMessage(
          event.message,
          options.operation.controller.signal.aborted,
        )
        const entryId = await options.session.appendMessage(durableMessage)
        persisted = true
        if (durableMessage.role === 'assistant') {
          finalEntryId = entryId
          finalMessage = durableMessage
        }
      } catch (error) {
        persistenceError = error
        throw error
      }
    })
    options.agent.subscribe((event) => this.forwardDelta(event, options.events))

    options.events.push({ sessionId: options.sessionId, type: 'start' })
    try {
      if (options.incoming) await options.agent.prompt(options.incoming)
      else await options.agent.continue()

      if (!finalMessage || !finalEntryId) {
        throw new AgentRuntimeError(
          'AGENT_RUN_FAILED',
          'Agent 未产生可持久化的最终消息。',
          500,
        )
      }
      await this.sessions.changed(options.sessionId)
      projected = true
      if (finalMessage.stopReason === 'aborted') {
        options.events.push({
          code: 'AGENT_RUN_ABORTED',
          message: '运行已终止。',
          type: 'error',
        })
        return
      }
      if (finalMessage.stopReason === 'error') {
        options.events.push({
          code: 'AGENT_RUN_FAILED',
          message: '模型调用失败。',
          type: 'error',
        })
        return
      }
      if (finalMessage.stopReason === 'pending') {
        throw new AgentRuntimeError(
          'AGENT_RUN_FAILED',
          'Agent 返回了未完成的消息。',
          500,
        )
      }
      const usage = finalMessage.usage
      options.events.push({
        cacheRead: usage.cacheRead,
        cacheWrite: usage.cacheWrite,
        input: usage.input,
        output: usage.output,
        total: usage.totalTokens,
        type: 'usage',
      })
      options.events.push({
        entryId: finalEntryId,
        stopReason: finalMessage.stopReason,
        type: 'done',
      })
    } catch (error) {
      options.events.push(
        runtimeEventError(
          persistenceError
            ? new AgentRuntimeError(
                'SESSION_PERSISTENCE_FAILED',
                '会话持久化操作失败。',
                500,
              )
            : error,
        ),
      )
    } finally {
      if (persisted && !projected) {
        await this.sessions.changed(options.sessionId)
      }
      await options.cleanupTools?.()
      options.events.end()
    }
  }

  private forwardDelta(
    event: AgentEvent,
    events: EventStream<AgentRuntimeEvent, void>,
  ) {
    if (event.type === 'message_update') {
      const update = event.assistantMessageEvent
      if (update.type === 'text_delta') {
        events.push({ delta: update.delta, type: 'text_delta' })
      } else if (update.type === 'thinking_delta') {
        events.push({ delta: update.delta, type: 'reasoning_delta' })
      }
    } else if (event.type === 'tool_execution_start') {
      events.push({
        input: safeToolInput(event.args),
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        type: 'tool_start',
      })
    } else if (event.type === 'tool_execution_end') {
      events.push({
        isError: event.isError,
        output: event.result?.content,
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        type: 'tool_end',
      })
    }
  }

  private approvalEvent(approval: PendingToolApproval) {
    const kind: 'edit' | 'read' = approval.toolName === 'read' ? 'read' : 'edit'
    return {
      approvalId: approval.approvalId,
      kind,
      path: approval.path,
      title: `允许 AI 助手${kind === 'read' ? '读取' : '修改'} ${approval.path} 吗？`,
      toolCallId: approval.toolCallId,
      toolName: approval.toolName,
      type: 'tool_approval_required' as const,
    }
  }

  private async appendApprovalRequested(
    session: Awaited<ReturnType<AgentSessionService['open']>>['session'],
    approval: PendingToolApproval,
  ) {
    await session.appendCustomEntry('devaid_tool_approval_requested', {
      approvalId: approval.approvalId,
      effect: approval.effect,
      path: approval.path,
      runId: approval.runId,
      toolCallId: approval.toolCallId,
      toolName: approval.toolName,
    })
  }

  private async appendApprovalResolved(
    session: Awaited<ReturnType<AgentSessionService['open']>>['session'],
    resolution: ApprovalResolution,
  ) {
    await session.appendCustomEntry('devaid_tool_approval_resolved', {
      approvalId: resolution.approvalId,
      decision: resolution.decision,
      reason: resolution.reason,
      runId: resolution.runId,
      toolCallId: resolution.toolCallId,
    })
  }

  private async repairInterruptedTools(
    session: Awaited<ReturnType<AgentSessionService['open']>>['session'],
    entries: Awaited<ReturnType<AgentSessionService['open']>>['entries'],
    sessionId: string,
  ) {
    const completedToolCalls = new Set(
      entries.flatMap((entry) =>
        entry.type === 'message' && entry.message.role === 'toolResult'
          ? [entry.message.toolCallId]
          : [],
      ),
    )
    const resolvedApprovals = new Set(
      entries.flatMap((entry) => {
        if (
          entry.type !== 'custom' ||
          entry.customType !== 'devaid_tool_approval_resolved' ||
          !entry.data ||
          typeof entry.data !== 'object' ||
          Array.isArray(entry.data)
        ) {
          return []
        }
        const approvalId = (entry.data as Record<string, unknown>).approvalId
        return typeof approvalId === 'string' ? [approvalId] : []
      }),
    )
    const approvalByToolCall = new Map<string, string>()
    for (const entry of entries) {
      if (
        entry.type !== 'custom' ||
        entry.customType !== 'devaid_tool_approval_requested' ||
        !entry.data ||
        typeof entry.data !== 'object' ||
        Array.isArray(entry.data)
      ) {
        continue
      }
      const data = entry.data as Record<string, unknown>
      if (
        typeof data.approvalId === 'string' &&
        typeof data.toolCallId === 'string'
      ) {
        approvalByToolCall.set(data.toolCallId, data.approvalId)
      }
    }
    const interrupted: { id: string; name: string }[] = []
    for (const entry of entries) {
      if (entry.type !== 'message' || entry.message.role !== 'assistant') {
        continue
      }
      for (const content of entry.message.content) {
        if (
          content.type === 'toolCall' &&
          !completedToolCalls.has(content.id)
        ) {
          interrupted.push({ id: content.id, name: content.name })
        }
      }
    }
    if (!interrupted.length) return entries

    for (const toolCall of interrupted) {
      const approvalId = approvalByToolCall.get(toolCall.id)
      if (approvalId && !resolvedApprovals.has(approvalId)) {
        await session.appendCustomEntry('devaid_tool_approval_resolved', {
          approvalId,
          decision: 'reject',
          reason: 'server-restarted',
          toolCallId: toolCall.id,
        })
      }
      await session.appendMessage({
        content: [
          {
            text: 'Tool execution was interrupted by a server restart and was not retried.',
            type: 'text',
          },
        ],
        isError: true,
        role: 'toolResult',
        timestamp: Date.now(),
        toolCallId: toolCall.id,
        toolName: toolCall.name,
      })
    }
    await this.sessions.changed(sessionId)
    return session.findEntriesOnBranch({ order: 'oldestFirst' })
  }

  private reserve(id: string, kind: ActiveOperation['kind']) {
    if (this.active.has(id)) {
      throw new AgentRuntimeError('SESSION_BUSY', '会话正在执行其他操作。', 409)
    }
    let finish: () => void = () => undefined
    const settled = new Promise<void>((resolve) => {
      finish = resolve
    })
    const operation: ActiveOperation = {
      controller: new AbortController(),
      finish,
      kind,
      settled,
    }
    this.active.set(id, operation)
    return operation
  }

  private release(id: string, operation: ActiveOperation) {
    if (this.active.get(id) === operation) this.active.delete(id)
    operation.finish()
  }

  private assertOpen() {
    if (this.closed) {
      throw new AgentRuntimeError(
        'AGENT_RUNTIME_CLOSED',
        'Agent Runtime 已关闭。',
        500,
      )
    }
  }
}
