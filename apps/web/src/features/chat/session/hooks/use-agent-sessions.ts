import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatStatus } from '@agile-avocation/ui-pro/prompt-input'
import type { ChatSubmitPayload } from '../../composer/index.ts'
import type {
  ChatMessage,
  ChatMessageActivityPart,
  ChatMessageTool,
  ChatThread,
} from '../../data/index.ts'
import type { ApprovalDecision } from '../../message/index.ts'
import {
  abortAgentSession,
  createAgentSession,
  getAgentSession,
  getPendingToolApproval,
  listAgentSessionMessages,
  listAgentSessions,
  reconnectAgentRun,
  resolveToolApproval,
  streamAgentMessage,
  updateAgentSessionModel,
} from '../api/index.ts'
import { toChatMessages, toChatThread } from '../data/index.ts'
import type { PendingToolApprovalVo } from '../types/index.ts'

type PendingApprovalMap = Record<string, PendingToolApprovalVo | undefined>

const messageTitle = (message: string) =>
  message.trim().replace(/\s+/gu, ' ').slice(0, 60)

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '会话请求失败，请重试。'

const toolOutputText = (output: unknown) => {
  if (typeof output === 'string') return output
  if (!Array.isArray(output)) return String(output ?? '')
  return output
    .flatMap((part) =>
      part && typeof part === 'object' && 'text' in part
        ? [String(part.text)]
        : [],
    )
    .join('\n')
}

const toolKind = (toolName: string): ChatMessageTool['kind'] =>
  toolName === 'bash' || toolName === 'command'
    ? 'command'
    : toolName === 'read' || toolName === 'view_attachment'
      ? 'read'
      : toolName === 'load_skill_resource'
        ? 'skill'
        : 'edit'

const streamingAssistant = (id: string): ChatMessage => ({
  actions: 'full',
  id,
  role: 'assistant',
  status: 'streaming',
  text: '',
})

/** 只清除本次已决议的审批，避免覆盖抢先到达的下一条 SSE 审批。 */
export const clearResolvedApproval = (
  approvals: PendingApprovalMap,
  sessionId: string,
  approvalId: string,
) =>
  approvals[sessionId]?.approvalId === approvalId
    ? { ...approvals, [sessionId]: undefined }
    : approvals

/** 读取流式消息的当前活动块，并兼容尚未携带 parts 的消息。 */
const messageActivityParts = (
  message: ChatMessage,
): ChatMessageActivityPart[] => {
  const parts = message.activity?.parts ?? message.parts
  if (parts) return [...parts]
  const reasoning = message.activity?.reasoning ?? message.reasoning
  const text = message.activity?.text ?? message.text
  const tools = message.activity?.tools ?? message.tools ?? []
  return [
    ...(reasoning ? [{ reasoning, type: 'reasoning' as const }] : []),
    ...(text ? [{ text, type: 'text' as const }] : []),
    ...tools.map((tool) => ({ tool, type: 'tool' as const })),
  ]
}

/** 合并相邻流式文本，跨工具调用时创建新的文本块。 */
const appendTextPart = (
  parts: readonly ChatMessageActivityPart[],
  delta: string,
) => {
  const next = [...parts]
  const last = next.at(-1)
  if (last?.type === 'text') {
    next[next.length - 1] = { ...last, text: `${last.text}${delta}` }
  } else {
    next.push({ text: delta, type: 'text' })
  }
  return next
}

/** 合并相邻流式推理，跨工具调用时创建新的推理块。 */
const appendReasoningPart = (
  parts: readonly ChatMessageActivityPart[],
  delta: string,
) => {
  const next = [...parts]
  const last = next.at(-1)
  if (last?.type === 'reasoning') {
    const steps = [...last.reasoning.steps]
    const lastStep = steps.at(-1)
    if (lastStep) {
      steps[steps.length - 1] = {
        ...lastStep,
        content: `${lastStep.content}${delta}`,
      }
    } else {
      steps.push({ content: delta, label: '思考过程' })
    }
    next[next.length - 1] = {
      ...last,
      reasoning: { ...last.reasoning, steps },
    }
  } else {
    next.push({
      reasoning: {
        defaultExpanded: false,
        steps: [{ content: delta, label: '思考过程' }],
      },
      type: 'reasoning',
    })
  }
  return next
}

/** 按事件到达位置追加流式文本，并合并相邻文本块。 */
export const appendStreamingText = (
  message: ChatMessage,
  delta: string,
): ChatMessage => {
  const parts = appendTextPart(messageActivityParts(message), delta)
  if (message.activity) {
    return {
      ...message,
      activity: {
        ...message.activity,
        parts,
        text: `${message.activity.text ?? ''}${delta}`,
      },
    }
  }
  return { ...message, parts, text: `${message.text ?? ''}${delta}` }
}

/** 按事件到达位置追加流式推理，并合并相邻推理块。 */
export const appendStreamingReasoning = (
  message: ChatMessage,
  delta: string,
): ChatMessage => {
  const reasoning = message.activity
    ? message.activity.reasoning
    : message.reasoning
  const content = reasoning?.steps[0]?.content ?? ''
  const nextReasoning = {
    defaultExpanded: !message.activity,
    steps: [{ content: `${content}${delta}`, label: '思考过程' }],
  }
  const parts = appendReasoningPart(messageActivityParts(message), delta)
  if (message.activity) {
    return {
      ...message,
      activity: { ...message.activity, parts, reasoning: nextReasoning },
    }
  }
  return { ...message, parts, reasoning: nextReasoning }
}

/** 将同一 toolCallId 的流式状态合并到当前 Assistant 消息。 */
export const updateStreamingTool = (
  message: ChatMessage,
  tool: NonNullable<ChatMessage['tools']>[number],
  startedAt: number,
) => {
  const tools = [...(message.activity?.tools ?? message.tools ?? [])]
  const index = tools.findIndex(
    (candidate) => candidate.toolCallId === tool.toolCallId,
  )
  if (index === -1) tools.push(tool)
  else tools[index] = { ...tools[index], ...tool }
  const parts = messageActivityParts(message)
  const partIndex = parts.findIndex(
    (part) => part.type === 'tool' && part.tool.toolCallId === tool.toolCallId,
  )
  if (partIndex === -1) parts.push({ tool, type: 'tool' })
  else {
    const part = parts[partIndex]
    if (part?.type === 'tool') {
      parts[partIndex] = { ...part, tool: { ...part.tool, ...tool } }
    }
  }
  return {
    ...message,
    actions: undefined,
    activity: {
      parts,
      reasoning: message.activity?.reasoning ?? message.reasoning,
      startedAt: message.activity?.startedAt ?? startedAt,
      text: message.activity?.text ?? message.text,
      tools,
    },
    reasoning: undefined,
    parts: undefined,
    text: undefined,
    tools: undefined,
  }
}

/** 协调真实 Session 列表、历史消息和当前 POST SSE 运行。 */
export function useAgentSessions() {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [statuses, setStatuses] = useState<Record<string, ChatStatus>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [loadingIds, setLoadingIds] = useState<ReadonlySet<string>>(new Set())
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalMap>(
    {},
  )
  const statusRef = useRef<Record<string, ChatStatus>>({})
  const loadingRef = useRef(new Map<string, Promise<void>>())

  const setStatus = useCallback((sessionId: string, status: ChatStatus) => {
    statusRef.current = { ...statusRef.current, [sessionId]: status }
    setStatuses(statusRef.current)
  }, [])

  const updateThread = useCallback(
    (sessionId: string, update: (thread: ChatThread) => ChatThread) => {
      setThreads((current) =>
        current.map((thread) =>
          thread.id === sessionId ? update(thread) : thread,
        ),
      )
    },
    [],
  )

  const loadMessages = useCallback(
    async (sessionId: string) => {
      const messages = []
      let before: number | undefined
      do {
        const page = await listAgentSessionMessages(sessionId, before)
        messages.push(...page.items)
        before = page.nextCursor ?? undefined
      } while (before !== undefined)

      const chatMessages = toChatMessages(
        messages.sort((left, right) => left.seq - right.seq),
      )
      updateThread(sessionId, (thread) => ({
        ...thread,
        messages: chatMessages,
        preview: chatMessages.at(-1)?.text ?? thread.preview,
      }))
    },
    [updateThread],
  )

  const refreshSessions = useCallback(async () => {
    try {
      const sessions = await listAgentSessions()
      setThreads((current) =>
        sessions.map((session) => {
          const next = toChatThread(session)
          const existing = current.find((thread) => thread.id === session.id)
          return existing
            ? {
                ...next,
                messages: existing.messages,
                preview: existing.preview || next.preview,
              }
            : next
        }),
      )
      setGlobalError('')
    } catch (error) {
      setGlobalError(errorMessage(error))
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- Session list is external state loaded after mount.
    void refreshSessions()
  }, [refreshSessions])

  const loadThread = useCallback(
    (sessionId: string) => {
      if (statusRef.current[sessionId] !== undefined) {
        return Promise.resolve()
      }
      const current = loadingRef.current.get(sessionId)
      if (current) return current

      setLoadingIds((ids) => new Set(ids).add(sessionId))
      setErrors((errors) => ({ ...errors, [sessionId]: '' }))
      const task = Promise.all([
        getAgentSession(sessionId),
        listAgentSessionMessages(sessionId),
        getPendingToolApproval(sessionId),
        reconnectAgentRun(sessionId, (event) => {
          if (event.type === 'tool_approval_required') {
            setPendingApprovals((current) => ({
              ...current,
              [sessionId]: event,
            }))
          } else if (event.type === 'tool_end') {
            setPendingApprovals((current) =>
              current[sessionId]?.toolCallId === event.toolCallId
                ? { ...current, [sessionId]: undefined }
                : current,
            )
          } else if (event.type === 'error') {
            setErrors((current) => ({
              ...current,
              [sessionId]: event.message,
            }))
          }
        }),
      ])
        .then(async ([session, firstPage, pendingApproval, reconnectedRun]) => {
          setPendingApprovals((current) => ({
            ...current,
            [sessionId]: current[sessionId] ?? pendingApproval,
          }))
          const next = toChatThread(session)
          const firstMessages = firstPage.items
          setThreads((threads) => {
            const existing = threads.find((thread) => thread.id === sessionId)
            const updated = {
              ...next,
              messages: existing?.messages ?? [],
            }
            return existing
              ? threads.map((thread) =>
                  thread.id === sessionId ? updated : thread,
                )
              : [updated, ...threads]
          })
          if (firstPage.nextCursor === null) {
            const messages = toChatMessages(
              firstMessages.sort((left, right) => left.seq - right.seq),
            )
            updateThread(sessionId, (thread) => ({ ...thread, messages }))
          } else {
            await loadMessages(sessionId)
          }
          setStatus(sessionId, reconnectedRun ? 'streaming' : 'ready')
          if (reconnectedRun) {
            void reconnectedRun.completed
              .then(async () => {
                await loadMessages(sessionId)
                const nextApproval = await getPendingToolApproval(sessionId)
                setPendingApprovals((current) => ({
                  ...current,
                  [sessionId]: nextApproval,
                }))
              })
              .catch((error) => {
                setErrors((current) => ({
                  ...current,
                  [sessionId]: errorMessage(error),
                }))
              })
              .finally(() => setStatus(sessionId, 'ready'))
          }
        })
        .catch((error) => {
          setErrors((current) => ({
            ...current,
            [sessionId]: errorMessage(error),
          }))
        })
        .finally(() => {
          loadingRef.current.delete(sessionId)
          setLoadingIds((ids) => {
            const next = new Set(ids)
            next.delete(sessionId)
            return next
          })
        })
      loadingRef.current.set(sessionId, task)
      return task
    },
    [loadMessages, setStatus, updateThread],
  )

  const createSession = useCallback(async (payload: ChatSubmitPayload) => {
    setIsCreating(true)
    setGlobalError('')
    try {
      const title = messageTitle(payload.message)
      const session = await createAgentSession({
        modelId: payload.modelId,
        ...(title ? { name: title } : {}),
        providerId: payload.providerId,
        workspaceId: payload.workspaceId,
      })
      const thread = toChatThread(session)
      setThreads((current) => [
        thread,
        ...current.filter((item) => item.id !== thread.id),
      ])
      return thread
    } catch (error) {
      setGlobalError(errorMessage(error))
      throw error
    } finally {
      setIsCreating(false)
    }
  }, [])

  const updateModel = useCallback(
    async (
      sessionId: string,
      input: Pick<ChatSubmitPayload, 'modelId' | 'providerId'>,
    ) => {
      setErrors((current) => ({ ...current, [sessionId]: '' }))
      try {
        const session = await updateAgentSessionModel(sessionId, input)
        updateThread(sessionId, (thread) => ({
          ...thread,
          modelId: session.modelId,
          providerId: session.providerId,
        }))
        return true
      } catch (error) {
        setErrors((current) => ({
          ...current,
          [sessionId]: errorMessage(error),
        }))
        return false
      }
    },
    [updateThread],
  )

  const sendMessage = useCallback(
    async (sessionId: string, payload: ChatSubmitPayload) => {
      const startedAt = Date.now()
      const userId = `pending-user-${crypto.randomUUID()}`
      const assistantId = `pending-assistant-${crypto.randomUUID()}`
      const previewUrls: string[] = []
      const attachments = payload.attachments.map((file) => {
        const src = file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined
        if (src) previewUrls.push(src)
        return { mimeType: file.type, name: file.name, src }
      })
      const contextItems = payload.contextItems.filter(
        (item) => item.kind === 'command' || item.kind === 'skill',
      )
      const preview =
        payload.message || attachments[0]?.name || contextItems[0]?.label || ''
      setErrors((current) => ({ ...current, [sessionId]: '' }))
      setStatus(sessionId, 'submitted')
      updateThread(sessionId, (thread) => ({
        ...thread,
        messages: [
          ...thread.messages,
          {
            attachments,
            contextItems,
            id: userId,
            role: 'user',
            text: payload.message,
          },
          streamingAssistant(assistantId),
        ],
        preview,
        updatedAt: '刚刚',
      }))

      let terminal = false
      let runError = ''
      try {
        await streamAgentMessage(
          sessionId,
          {
            attachments: payload.attachments,
            commandId: contextItems.find((item) => item.kind === 'command')
              ?.sourceId,
            content: payload.message,
            permission: payload.permission,
            skillIds: contextItems.flatMap((item) =>
              item.kind === 'skill' && item.sourceId ? [item.sourceId] : [],
            ),
          },
          (event) => {
            switch (event.type) {
              case 'start':
                setStatus(sessionId, 'streaming')
                break
              case 'text_delta':
                updateThread(sessionId, (thread) => ({
                  ...thread,
                  messages: thread.messages.map((item) =>
                    item.id === assistantId
                      ? appendStreamingText(item, event.delta)
                      : item,
                  ),
                }))
                break
              case 'reasoning_delta':
                updateThread(sessionId, (thread) => ({
                  ...thread,
                  messages: thread.messages.map((item) =>
                    item.id === assistantId
                      ? appendStreamingReasoning(item, event.delta)
                      : item,
                  ),
                }))
                break
              case 'tool_start':
                updateThread(sessionId, (thread) => ({
                  ...thread,
                  messages: thread.messages.map((item) =>
                    item.id === assistantId
                      ? updateStreamingTool(
                          item,
                          {
                            input: event.input,
                            kind: toolKind(event.toolName),
                            state: 'input-available',
                            toolCallId: event.toolCallId,
                            toolName: event.toolName,
                          },
                          startedAt,
                        )
                      : item,
                  ),
                }))
                break
              case 'tool_end':
                setPendingApprovals((current) =>
                  current[sessionId]?.toolCallId === event.toolCallId
                    ? { ...current, [sessionId]: undefined }
                    : current,
                )
                updateThread(sessionId, (thread) => ({
                  ...thread,
                  messages: thread.messages.map((item) =>
                    item.id === assistantId
                      ? updateStreamingTool(
                          item,
                          {
                            ...(event.isError
                              ? { errorText: toolOutputText(event.output) }
                              : { output: event.output }),
                            input:
                              (item.activity?.tools ?? item.tools)?.find(
                                (tool) => tool.toolCallId === event.toolCallId,
                              )?.input ?? {},
                            kind: toolKind(event.toolName),
                            outcome: event.outcome,
                            state: event.isError
                              ? 'output-error'
                              : 'output-available',
                            toolCallId: event.toolCallId,
                            toolName: event.toolName,
                          },
                          startedAt,
                        )
                      : item,
                  ),
                }))
                break
              case 'tool_approval_required':
                setPendingApprovals((current) => ({
                  ...current,
                  [sessionId]: event,
                }))
                updateThread(sessionId, (thread) => ({
                  ...thread,
                  messages: thread.messages.map((item) =>
                    item.id === assistantId
                      ? updateStreamingTool(
                          item,
                          {
                            approval: {
                              ...(event.kind === 'command'
                                ? {
                                    description: JSON.stringify(
                                      event.input,
                                      null,
                                      2,
                                    ),
                                  }
                                : {}),
                              title: event.title,
                            },
                            input:
                              event.kind === 'command'
                                ? event.input
                                : { path: event.path },
                            kind: event.kind,
                            state: 'requires-action',
                            toolCallId: event.toolCallId,
                            toolName: event.toolName,
                          },
                          startedAt,
                        )
                      : item,
                  ),
                }))
                break
              case 'done':
                terminal = true
                updateThread(sessionId, (thread) => ({
                  ...thread,
                  messages: thread.messages.map((item) =>
                    item.id === assistantId && item.activity
                      ? {
                          ...item,
                          activity: { ...item.activity, endedAt: Date.now() },
                        }
                      : item,
                  ),
                }))
                break
              case 'error':
                terminal = true
                runError = event.message
                updateThread(sessionId, (thread) => ({
                  ...thread,
                  messages: thread.messages.map((item) =>
                    item.id === assistantId && item.activity
                      ? {
                          ...item,
                          activity: {
                            ...item.activity,
                            endedAt: Date.now(),
                            hasError: true,
                          },
                        }
                      : item,
                  ),
                }))
                break
              case 'usage':
                break
            }
          },
        )
        if (!terminal) runError = '连接已中断，已重新加载持久化消息。'
      } catch (error) {
        runError = errorMessage(error)
      }

      try {
        await loadMessages(sessionId)
        const pendingApproval = await getPendingToolApproval(sessionId)
        setPendingApprovals((current) => ({
          ...current,
          [sessionId]: pendingApproval,
        }))
      } catch (error) {
        runError ||= errorMessage(error)
      } finally {
        previewUrls.forEach((url) => URL.revokeObjectURL(url))
        setStatus(sessionId, 'ready')
      }
      if (runError) {
        setErrors((current) => ({ ...current, [sessionId]: runError }))
      }
    },
    [loadMessages, setStatus, updateThread],
  )

  const abort = useCallback(
    async (sessionId: string) => {
      try {
        await abortAgentSession(sessionId)
        await loadMessages(sessionId)
      } catch (error) {
        setErrors((current) => ({
          ...current,
          [sessionId]: errorMessage(error),
        }))
      } finally {
        setPendingApprovals((current) => ({
          ...current,
          [sessionId]: undefined,
        }))
        setStatus(sessionId, 'ready')
      }
    },
    [loadMessages, setStatus],
  )

  const resolveApproval = useCallback(
    async (sessionId: string, decision: ApprovalDecision) => {
      const approval = pendingApprovals[sessionId]
      if (!approval) return
      try {
        await resolveToolApproval(sessionId, approval.approvalId, decision)
        setPendingApprovals((current) =>
          clearResolvedApproval(current, sessionId, approval.approvalId),
        )
      } catch (error) {
        setErrors((current) => ({
          ...current,
          [sessionId]: errorMessage(error),
        }))
      }
    },
    [pendingApprovals],
  )

  return {
    abort,
    createSession,
    errors,
    globalError,
    isCreating,
    loadingIds,
    loadThread,
    pendingApprovals,
    refreshSessions,
    resolveApproval,
    sendMessage,
    statuses,
    threads,
    updateModel,
  }
}
