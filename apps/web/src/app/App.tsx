import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChatActivePage } from '../features/chat/chat-data.ts'
import {
  CHAT_THREADS,
  getChatThread,
} from '../features/chat/chat-data.ts'
import type { ChatWorkspace } from '../features/chat/workspace-data.ts'
import {
  findWorkspaceByThreadId,
  INITIAL_CHAT_WORKSPACES,
} from '../features/chat/workspace-data.ts'
import { ChatPage } from '../pages/chat/ChatPage.tsx'
import { ExplorePage } from '../pages/explore/ExplorePage.tsx'
import { LibraryPage } from '../pages/library/LibraryPage.tsx'
import { NewChatPage } from '../pages/new-chat/NewChatPage.tsx'
import { ChatLayout } from './ChatLayout.tsx'
import { resolveChatRoute } from './chat-route.ts'

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
  const selectedThread =
    route.kind === 'thread'
      ? (getChatThread(route.threadId) ?? CHAT_THREADS[0])
      : undefined

  const activePage = useMemo<ChatActivePage>(() => {
    if (route.kind === 'thread') {
      return selectedThread
        ? { kind: 'thread', thread: selectedThread }
        : { kind: 'new' }
    }

    return { kind: route.kind }
  }, [route, selectedThread])
  const [workspaces, setWorkspaces] = useState<readonly ChatWorkspace[]>(
    INITIAL_CHAT_WORKSPACES,
  )
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(() => {
    if (activePage.kind === 'thread') {
      return (
        findWorkspaceByThreadId(
          INITIAL_CHAT_WORKSPACES,
          activePage.thread.id,
        )?.id ?? INITIAL_CHAT_WORKSPACES[0]?.id ?? ''
      )
    }

    return INITIAL_CHAT_WORKSPACES[0]?.id ?? ''
  })

  /** 把新选择的本地目录加入聊天外壳的页面内工作区。 */
  const handleWorkspaceAdd = useCallback((workspace: ChatWorkspace) => {
    setWorkspaces((currentWorkspaces) => [
      ...currentWorkspaces,
      workspace,
    ])
  }, [])

  const commitNavigation = useCallback(
    (path: string, nextDraft = '', replace = false) => {
      if (!path.startsWith('/') || path.startsWith('//')) return

      const nextRoute = resolveChatRoute(path)
      if (nextRoute.kind === 'thread') {
        const nextWorkspace = findWorkspaceByThreadId(
          workspaces,
          nextRoute.threadId,
        )
        if (nextWorkspace) setSelectedWorkspaceId(nextWorkspace.id)
      }

      const method = replace ? 'replaceState' : 'pushState'
      window.history[method]({ draft: nextDraft }, '', path)
      setDraft(nextDraft)
      setPathname(window.location.pathname)
    },
    [workspaces],
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
          workspaces,
          nextRoute.threadId,
        )
        if (nextWorkspace) setSelectedWorkspaceId(nextWorkspace.id)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [workspaces])

  useEffect(() => {
    if (
      route.kind === 'thread' &&
      selectedThread &&
      route.threadId !== selectedThread.id
    ) {
      window.history.replaceState(
        { draft: '' },
        '',
        `/${selectedThread.id}`,
      )
    }
  }, [route, selectedThread])

  const page = (() => {
    switch (activePage.kind) {
      case 'explore':
        return <ExplorePage onNavigate={navigate} />
      case 'library':
        return <LibraryPage onNavigate={navigate} />
      case 'thread':
        return <ChatPage key={activePage.thread.id} thread={activePage.thread} />
      case 'new':
        return <NewChatPage draft={draft} onDraftChange={setDraft} />
    }
  })()

  return (
    <ChatLayout
      activePage={activePage}
      selectedWorkspaceId={selectedWorkspaceId}
      workspaces={workspaces}
      onNavigate={navigate}
      onWorkspaceAdd={handleWorkspaceAdd}
      onWorkspaceSelect={setSelectedWorkspaceId}
    >
      {page}
    </ChatLayout>
  )
}
