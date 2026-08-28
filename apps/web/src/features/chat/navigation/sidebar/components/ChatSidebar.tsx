import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Sidebar } from '@agile-avocation/ui-pro/sidebar'
import { Sheet } from '@agile-avocation/ui-pro/sheet'
import type { ChatSidebarProps } from '../types/chat-sidebar.ts'
import { SidebarContents } from './SidebarContents.tsx'

/** 渲染品牌、聊天导航和设置入口，桌面与移动侧栏共享内容。 */
export function ChatSidebar({
  activePage,
  isWorkspaceLoading,
  onWorkspaceAdd,
  onWorkspaceSelect,
  onSearch,
  onSettings,
  selectedWorkspaceId,
  threads,
  workspaces,
  workspaceError: externalWorkspaceError,
}: ChatSidebarProps) {
  const [expandedWorkspaceIds, setExpandedWorkspaceIds] = useState(
    () => new Set<string>(),
  )
  const [isAddingWorkspace, setIsAddingWorkspace] = useState(false)
  /** 请求本地 Server 打开系统目录选择器，并展开成功注册的工作区。 */
  const handleAddWorkspace = async () => {
    setIsAddingWorkspace(true)
    try {
      const workspace = await onWorkspaceAdd()
      if (workspace === null) return
      onWorkspaceSelect(workspace.id)
      setExpandedWorkspaceIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.add(workspace.id)
        return nextIds
      })
    } catch {
      // 具体错误由 Workspace Hook 从服务端响应提供。
    } finally {
      setIsAddingWorkspace(false)
    }
  }

  /** 选择工作区，并切换其会话列表的展开状态。 */
  const handleWorkspaceToggle = (workspaceId: string) => {
    onWorkspaceSelect(workspaceId)
    setExpandedWorkspaceIds((currentIds) => {
      const nextIds = new Set(currentIds)

      if (nextIds.has(workspaceId)) nextIds.delete(workspaceId)
      else nextIds.add(workspaceId)

      return nextIds
    })
  }

  const contentProps = {
    activePage,
    expandedWorkspaceIds,
    isAddingWorkspace: isAddingWorkspace || isWorkspaceLoading,
    onAddWorkspace: handleAddWorkspace,
    onSearch,
    onSettings,
    onWorkspaceSelect,
    onWorkspaceToggle: handleWorkspaceToggle,
    selectedWorkspaceId,
    threads,
    workspaceError: externalWorkspaceError,
    workspaces,
  }

  return (
    <>
      <Sidebar
        className="bg-surface-secondary"
        style={{ '--sidebar-width-collapsed': '56px' } as CSSProperties}
      >
        <SidebarContents {...contentProps} />
        <Sidebar.Rail aria-label="切换侧边栏" />
      </Sidebar>
      <Sidebar.Mobile>
        <Sheet.Heading className="sr-only">导航</Sheet.Heading>
        <SidebarContents {...contentProps} idPrefix="mobile-" />
      </Sidebar.Mobile>
    </>
  )
}
