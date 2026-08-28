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

/** 协调 Pi Agent 与 Session 生命周期。 */
export class AgentRuntime {
  private readonly active = new Map<string, ActiveOperation>()
  private readonly models: ModelService
  private readonly sessions: AgentSessionService
  private closed = false

  constructor(
    models: ModelService,
    repository: AgentSessionRepository,
    projection?: AgentSessionProjection,
  ) {
    this.models = models
    this.sessions = new AgentSessionService(repository, projection)
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

  prompt(id: string, content: string) {
    return this.startRun(id, createUserMessage(content))
  }

  continue(id: string) {
    return this.startRun(id)
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
      let entries = opened.entries
      try {
        entries = await compactSessionIfNeeded({
          entries: opened.entries,
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

      const agent = new Agent({
        initialState: {
          messages: context.messages,
          model,
          systemPrompt: '',
          thinkingLevel: 'off',
          tools: [],
        },
        sessionId: id,
        streamFn: (streamModel, streamContext, options) =>
          this.models.models.streamSimple(streamModel, streamContext, options),
      })
      operation.agent = agent
      const events = new EventStream<AgentRuntimeEvent, void>(
        (event) => event.type === 'done' || event.type === 'error',
        () => undefined,
      )
      void this.executeRun({
        agent,
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
      options.events.end()
    }
  }

  private forwardDelta(
    event: AgentEvent,
    events: EventStream<AgentRuntimeEvent, void>,
  ) {
    if (event.type !== 'message_update') return
    const update = event.assistantMessageEvent
    if (update.type === 'text_delta') {
      events.push({ delta: update.delta, type: 'text_delta' })
    } else if (update.type === 'thinking_delta') {
      events.push({ delta: update.delta, type: 'reasoning_delta' })
    }
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
