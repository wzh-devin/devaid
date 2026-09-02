import { useCallback, useEffect, useState } from 'react'
import type { ChatWorkspace } from '../data/index.ts'
import {
  deleteWorkspace,
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

  /** 删除服务端工作区注册，并在成功后同步本地列表。 */
  const removeWorkspace = useCallback(async (workspaceId: string) => {
    setError('')
    try {
      await deleteWorkspace(workspaceId)
      setWorkspaces((current) =>
        current.filter((workspace) => workspace.id !== workspaceId),
      )
      return ''
    } catch (requestError) {
      const message = errorMessage(requestError)
      setError(message)
      return message
    }
  }, [])

  return {
    addWorkspace,
    error,
    isLoading,
    refresh,
    removeWorkspace,
    workspaces,
  }
}
