import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  type ChatActivePage,
  type ChatSubmitPayload,
  type ChatThread,
  createPendingChatThread,
  findWorkspaceByThreadId,
  useAgentSessions,
  useWorkspaces,
} from '../features/chat/index.ts'
import { ChatPage } from '../pages/chat/index.ts'
import { ExplorePage } from '../pages/explore/index.ts'
import { LibraryPage } from '../pages/library/index.ts'
import { NewChatPage } from '../pages/new-chat/index.ts'
import { ChatLayout } from './ChatLayout.tsx'
import { resolveChatRoute } from './routing/index.ts'

/** 从浏览器历史状态中安全读取可选草稿，忽略其他页面写入的状态。 */
const readHistoryDraft = () => {
  const state: unknown = window.history.state

  if (!state || typeof state !== 'object') return ''

  const draft = (state as Record<string, unknown>).draft
  return typeof draft === 'string' ? draft : ''
}

/** 维护站内 URL 状态，并组合对应的聊天页面。 */
export function App() {
  const [draft, setDraft] = useState(readHistoryDraft)
  const [pathname, setPathname] = useState(window.location.pathname)
  const route = useMemo(() => resolveChatRoute(pathname), [pathname])
  const {
    abort,
    createSession,
    errors,
    globalError,
    isCreating,
    loadingIds,
    loadThread,
    pendingApprovals,
    resolveApproval,
    sendMessage,
    statuses,
    threads,
    updateModel,
  } = useAgentSessions()
  const {
    addWorkspace,
    error: workspaceError,
    isLoading: isWorkspaceLoading,
    workspaces,
  } = useWorkspaces()
  const selectedThread =
    route.kind === 'thread'
      ? threads.find((thread) => thread.id === route.threadId)
      : undefined

  const activePage = useMemo<ChatActivePage>(() => {
    if (route.kind === 'thread') {
      return {
        kind: 'thread',
        thread: selectedThread ?? createPendingChatThread(route.threadId),
      }
    }

    return { kind: route.kind }
  }, [route, selectedThread])
  const visibleWorkspaces = useMemo(
    () =>
      workspaces.map((workspace) => ({
        ...workspace,
        threadIds: threads
          .filter((thread) => thread.workspaceId === workspace.id)
          .map((thread) => thread.id),
      })),
    [threads, workspaces],
  )
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')

  useEffect(() => {
    const threadWorkspaceId = selectedThread?.workspaceId
    const nextWorkspaceId =
      threadWorkspaceId &&
      workspaces.some((workspace) => workspace.id === threadWorkspaceId)
        ? threadWorkspaceId
        : workspaces.some((workspace) => workspace.id === selectedWorkspaceId)
          ? selectedWorkspaceId
          : (workspaces[0]?.id ?? '')
    if (nextWorkspaceId !== selectedWorkspaceId) {
      // oxlint-disable-next-line react/set-state-in-effect -- Server workspace restore selects the first valid workspace.
      setSelectedWorkspaceId(nextWorkspaceId)
    }
  }, [selectedThread, selectedWorkspaceId, workspaces])

  const commitNavigation = useCallback(
    (path: string, nextDraft = '', replace = false) => {
      if (!path.startsWith('/') || path.startsWith('//')) return

      const nextRoute = resolveChatRoute(path)
      if (nextRoute.kind === 'thread') {
        const nextWorkspace = findWorkspaceByThreadId(
          visibleWorkspaces,
          nextRoute.threadId,
        )
        if (nextWorkspace) setSelectedWorkspaceId(nextWorkspace.id)
      }

      const method = replace ? 'replaceState' : 'pushState'
      window.history[method]({ draft: nextDraft }, '', path)
      setDraft(nextDraft)
      setPathname(window.location.pathname)
    },
    [visibleWorkspaces],
  )

  const navigate = useCallback(
    (path: string, nextDraft = '') => commitNavigation(path, nextDraft),
    [commitNavigation],
  )

  useEffect(() => {
    const handlePopState = () => {
      setDraft(readHistoryDraft())
      setPathname(window.location.pathname)

      const nextRoute = resolveChatRoute(window.location.pathname)
      if (nextRoute.kind === 'thread') {
        const nextWorkspace = findWorkspaceByThreadId(
          visibleWorkspaces,
          nextRoute.threadId,
        )
        if (nextWorkspace) setSelectedWorkspaceId(nextWorkspace.id)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [visibleWorkspaces])

  useEffect(() => {
    if (route.kind === 'thread') void loadThread(route.threadId)
  }, [loadThread, route])

  const handleNewChatSubmit = useCallback(
    async (payload: ChatSubmitPayload) => {
      try {
        const thread = await createSession(payload)
        setSelectedWorkspaceId(payload.workspaceId)
        void sendMessage(thread.id, payload)
        commitNavigation(`/${thread.id}`)
        return true
      } catch {
        return false
      }
    },
    [commitNavigation, createSession, sendMessage],
  )

  const handleThreadSubmit = useCallback(
    (thread: ChatThread, payload: ChatSubmitPayload) => {
      void sendMessage(thread.id, payload)
      return true
    },
    [sendMessage],
  )

  const page = (() => {
    switch (activePage.kind) {
      case 'explore':
        return <ExplorePage onNavigate={navigate} />
      case 'library':
        return <LibraryPage onNavigate={navigate} />
      case 'thread':
        return (
          <ChatPage
            key={activePage.thread.id}
            error={errors[activePage.thread.id]}
            isLoading={loadingIds.has(activePage.thread.id)}
            pendingApproval={pendingApprovals[activePage.thread.id]}
            status={statuses[activePage.thread.id] ?? 'ready'}
            thread={activePage.thread}
            onModelChange={(selection) =>
              updateModel(activePage.thread.id, selection)
            }
            onStop={() => void abort(activePage.thread.id)}
            onApprovalResolve={(decision) =>
              resolveApproval(activePage.thread.id, decision)
            }
            onSubmit={(payload) =>
              handleThreadSubmit(activePage.thread, payload)
            }
          />
        )
      case 'new':
        return (
          <NewChatPage
            draft={draft}
            error={globalError}
            status={isCreating ? 'submitted' : 'ready'}
            onDraftChange={setDraft}
            onSubmit={handleNewChatSubmit}
          />
        )
    }
  })()

  return (
    <ChatLayout
      activePage={activePage}
      isWorkspaceLoading={isWorkspaceLoading}
      selectedWorkspaceId={selectedWorkspaceId}
      threads={threads}
      workspaces={visibleWorkspaces}
      onNavigate={navigate}
      workspaceError={workspaceError}
      onWorkspaceAdd={addWorkspace}
      onWorkspaceSelect={setSelectedWorkspaceId}
    >
      {page}
    </ChatLayout>
  )
}
