import { useCallback, useEffect, useState } from 'react'
import type { ChatWorkspace } from '../data/index.ts'
import {
  listWorkspaces,
  selectWorkspace,
  type WorkspaceVo,
} from '../api/index.ts'

const toChatWorkspace = (workspace: WorkspaceVo): ChatWorkspace => ({
  available: workspace.available,
  id: workspace.id,
  label: workspace.name,
  threadIds: [],
})

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '工作区请求失败，请重试。'

/** 加载和注册由 Server 持久化的本地工作区。 */
export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<ChatWorkspace[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      setWorkspaces((await listWorkspaces()).map(toChatWorkspace))
      setError('')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- Workspace list is external state loaded after mount.
    void refresh()
  }, [refresh])

  const addWorkspace = useCallback(async () => {
    setError('')
    try {
      const selected = await selectWorkspace()
      if (selected === null) return null
      const workspace = toChatWorkspace(selected)
      setWorkspaces((current) => [
        ...current.filter((item) => item.id !== workspace.id),
        workspace,
      ])
      return workspace
    } catch (requestError) {
      setError(errorMessage(requestError))
      throw requestError
    }
  }, [])

  return { addWorkspace, error, isLoading, refresh, workspaces }
}
