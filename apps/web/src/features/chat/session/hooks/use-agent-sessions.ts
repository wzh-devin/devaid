import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatStatus } from '@agile-avocation/ui-pro/prompt-input'
import type { ChatSubmitPayload } from '../../composer/index.ts'
import type { ChatMessage, ChatThread } from '../../data/index.ts'
import {
  abortAgentSession,
  createAgentSession,
  getAgentSession,
  listAgentSessionMessages,
  listAgentSessions,
  streamAgentMessage,
  updateAgentSessionModel,
} from '../api/index.ts'
import { toChatMessage, toChatThread } from '../data/index.ts'

const messageTitle = (message: string) =>
  message.trim().replace(/\s+/gu, ' ').slice(0, 60)

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '会话请求失败，请重试。'

const streamingAssistant = (id: string): ChatMessage => ({
  actions: 'full',
  id,
  role: 'assistant',
  status: 'streaming',
  text: '',
})

/** 协调真实 Session 列表、历史消息和当前 POST SSE 运行。 */
export function useAgentSessions() {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [statuses, setStatuses] = useState<Record<string, ChatStatus>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [loadingIds, setLoadingIds] = useState<ReadonlySet<string>>(new Set())
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

      const chatMessages = messages
        .sort((left, right) => left.seq - right.seq)
        .map(toChatMessage)
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
      const task = Promise.all([
        getAgentSession(sessionId),
        listAgentSessionMessages(sessionId),
      ])
        .then(([session, firstPage]) => {
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
            const messages = firstMessages
              .sort((left, right) => left.seq - right.seq)
              .map(toChatMessage)
            updateThread(sessionId, (thread) => ({ ...thread, messages }))
            return
          }
          return loadMessages(sessionId)
        })
        .then(() => {
          setStatus(sessionId, 'ready')
          setErrors((current) => ({ ...current, [sessionId]: '' }))
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
      const session = await createAgentSession({
        modelId: payload.modelId,
        name: messageTitle(payload.message),
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
    async (sessionId: string, message: string) => {
      const userId = `pending-user-${crypto.randomUUID()}`
      const assistantId = `pending-assistant-${crypto.randomUUID()}`
      setErrors((current) => ({ ...current, [sessionId]: '' }))
      setStatus(sessionId, 'submitted')
      updateThread(sessionId, (thread) => ({
        ...thread,
        messages: [
          ...thread.messages,
          { id: userId, role: 'user', text: message },
          streamingAssistant(assistantId),
        ],
        preview: message,
        updatedAt: '刚刚',
      }))

      let terminal = false
      let runError = ''
      try {
        await streamAgentMessage(sessionId, message, (event) => {
          switch (event.type) {
            case 'start':
              setStatus(sessionId, 'streaming')
              break
            case 'text_delta':
              updateThread(sessionId, (thread) => ({
                ...thread,
                messages: thread.messages.map((item) =>
                  item.id === assistantId
                    ? { ...item, text: `${item.text ?? ''}${event.delta}` }
                    : item,
                ),
              }))
              break
            case 'reasoning_delta':
              updateThread(sessionId, (thread) => ({
                ...thread,
                messages: thread.messages.map((item) => {
                  if (item.id !== assistantId) return item
                  const content = item.reasoning?.steps[0]?.content ?? ''
                  return {
                    ...item,
                    reasoning: {
                      defaultExpanded: true,
                      steps: [
                        {
                          content: `${content}${event.delta}`,
                          label: '思考过程',
                        },
                      ],
                    },
                  }
                }),
              }))
              break
            case 'done':
              terminal = true
              break
            case 'error':
              terminal = true
              runError = event.message
              break
            case 'usage':
              break
          }
        })
        if (!terminal) runError = '连接已中断，已重新加载持久化消息。'
      } catch (error) {
        runError = errorMessage(error)
      }

      try {
        await loadMessages(sessionId)
      } catch (error) {
        runError ||= errorMessage(error)
      } finally {
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
        setStatus(sessionId, 'ready')
      }
    },
    [loadMessages, setStatus],
  )

  return {
    abort,
    createSession,
    errors,
    globalError,
    isCreating,
    loadingIds,
    loadThread,
    refreshSessions,
    sendMessage,
    statuses,
    threads,
    updateModel,
  }
}
