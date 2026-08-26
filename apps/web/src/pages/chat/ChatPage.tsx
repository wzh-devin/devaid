import { useState } from 'react'
import { AppLayout, useAppLayout } from '@agile-avocation/ui-pro/app-layout'
import { ChatConversation } from '@agile-avocation/ui-pro/chat-conversation'
import { Tabs } from '@heroui/react'
import {
  type ApprovalDecision,
  ApprovalPrompt,
  ChatComposer,
  type ChatThread,
  findPendingToolApproval,
  findWorkspaceByThreadId,
  ThreadMessage,
  useChatWorkspace,
} from '../../features/chat/index.ts'
import { AgentTraceView } from '../../features/trace/index.ts'

interface ChatPageProps {
  thread: ChatThread
}

/** 渲染 Recent 会话消息，并复用聊天输入区进行前端模拟发送。 */
export function ChatPage({ thread }: ChatPageProps) {
  const [draft, setDraft] = useState('')
  const [approvalDecisions, setApprovalDecisions] = useState<
    Record<string, ApprovalDecision>
  >({})
  const [approvedThreadTools, setApprovedThreadTools] = useState<string[]>([])
  const appLayout = useAppLayout()
  const { selectedWorkspaceId, workspaces } = useChatWorkspace()
  const [fixedWorkspaceId] = useState(
    () =>
      findWorkspaceByThreadId(workspaces, thread.id)?.id ?? selectedWorkspaceId,
  )
  const pendingApproval = findPendingToolApproval(
    thread.messages,
    Object.keys(approvalDecisions),
    approvedThreadTools,
  )

  /** 结束当前 mock 审批并继续显示下一个待审批工具。 */
  const handleApprovalResolve = (decision: ApprovalDecision) => {
    if (!pendingApproval) return
    if (decision === 'approve-thread') {
      setApprovedThreadTools((toolNames) => [
        ...toolNames,
        pendingApproval.tool.toolName,
      ])
    }
    setApprovalDecisions((decisions) => ({
      ...decisions,
      [pendingApproval.key]: decision,
    }))
  }

  return (
    <div className="flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden min-[769px]:h-svh">
      <Tabs
        className="relative flex min-h-0 flex-1 flex-col"
        defaultSelectedKey="conversation"
        variant="secondary"
      >
        <Tabs.ListContainer className="shrink-0 border-b border-divider px-4">
          <Tabs.List aria-label="会话视图" className="!min-w-0">
            <Tabs.Tab className="h-11 !w-auto px-3" id="conversation">
              对话
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab className="h-11 !w-auto px-3" id="trajectory">
              轨迹
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <AppLayout.AsideTrigger
          aria-label={appLayout?.isAsideOpen ? '关闭变更侧栏' : '打开变更侧栏'}
          className="!absolute top-1.5 right-4 z-10 !m-0 !inline-flex data-[state=open]:bg-default"
          closedTooltip="打开变更侧栏"
          openTooltip="关闭变更侧栏"
          tooltipProps={{ delay: 0, placement: 'bottom' }}
          variant="tertiary"
        />

        <Tabs.Panel
          className="min-h-0 flex-1 overflow-hidden p-0"
          id="conversation"
        >
          <ChatConversation className="h-full min-h-0">
            <ChatConversation.Content className="flex flex-col">
              <div className="mx-auto flex w-full max-w-[714px] flex-col gap-8 px-4 pt-10 pb-6">
                {thread.messages.map((message) => (
                  <ThreadMessage
                    key={message.id}
                    approvalDecisions={approvalDecisions}
                    message={message}
                  />
                ))}
              </div>
              <ChatConversation.ScrollAnchor />
            </ChatConversation.Content>
          </ChatConversation>
        </Tabs.Panel>

        <Tabs.Panel
          className="min-h-0 flex-1 overflow-hidden p-0"
          id="trajectory"
        >
          <AgentTraceView />
        </Tabs.Panel>
      </Tabs>

      <div className="shrink-0 bg-background px-4 pt-3 pb-4">
        <div className="mx-auto w-full max-w-[714px]">
          {pendingApproval ? (
            <ApprovalPrompt
              tool={pendingApproval.tool}
              onResolve={handleApprovalResolve}
            />
          ) : (
            <ChatComposer
              fixedWorkspaceId={fixedWorkspaceId}
              initialModelId={thread.modelId}
              value={draft}
              onValueChange={setDraft}
            />
          )}
        </div>
      </div>
    </div>
  )
}
