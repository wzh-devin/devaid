import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Sidebar } from '@agile-avocation/ui-pro/sidebar'
import { Sheet } from '@agile-avocation/ui-pro/sheet'
import type { WorkspaceDirectoryPickerWindow } from '../../../workspace/data/workspace-data.ts'
import {
  findWorkspaceByDirectory,
  INITIAL_CHAT_WORKSPACES,
} from '../../../workspace/data/workspace-data.ts'
import type { ChatSidebarProps } from '../types/chat-sidebar.ts'
import { SidebarContents } from './SidebarContents.tsx'

/** 渲染品牌、聊天导航和设置入口，桌面与移动侧栏共享内容。 */
export function ChatSidebar({
  activePage,
  onWorkspaceAdd,
  onWorkspaceSelect,
  onSearch,
  onSettings,
  selectedWorkspaceId,
  threads,
  workspaces,
}: ChatSidebarProps) {
  const [expandedWorkspaceIds, setExpandedWorkspaceIds] = useState(
    () => new Set(INITIAL_CHAT_WORKSPACES.map((workspace) => workspace.id)),
  )
  const [isAddingWorkspace, setIsAddingWorkspace] = useState(false)
  const [workspaceError, setWorkspaceError] = useState('')
  /** 打开原生目录选择器，并把真实目录加入当前页面的工作区列表。 */
  const handleAddWorkspace = async () => {
    const pickerWindow = window as WorkspaceDirectoryPickerWindow

    setWorkspaceError('')
    if (!pickerWindow.showDirectoryPicker) {
      setWorkspaceError('当前浏览器不支持选择本地目录。')
      return
    }

    setIsAddingWorkspace(true)
    try {
      const directoryHandle = await pickerWindow.showDirectoryPicker()
      const existingWorkspace = await findWorkspaceByDirectory(
        workspaces,
        directoryHandle,
      )
      const workspaceId =
        existingWorkspace?.id ?? `workspace-${crypto.randomUUID()}`

      if (!existingWorkspace) {
        onWorkspaceAdd({
          directoryHandle,
          id: workspaceId,
          label: directoryHandle.name,
          threadIds: [],
        })
      }

      onWorkspaceSelect(workspaceId)
      setExpandedWorkspaceIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.add(workspaceId)
        return nextIds
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setWorkspaceError('无法添加该目录，请重试。')
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
    isAddingWorkspace,
    onAddWorkspace: handleAddWorkspace,
    onSearch,
    onSettings,
    onWorkspaceSelect,
    onWorkspaceToggle: handleWorkspaceToggle,
    selectedWorkspaceId,
    threads,
    workspaceError,
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
