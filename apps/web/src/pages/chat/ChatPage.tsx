import { useState } from 'react'
import { AppLayout, useAppLayout } from '@agile-avocation/ui-pro/app-layout'
import { ChatConversation } from '@agile-avocation/ui-pro/chat-conversation'
import type { ChatStatus } from '@agile-avocation/ui-pro/prompt-input'
import { Tabs } from '@heroui/react'
import {
  type ApprovalDecision,
  ApprovalPrompt,
  ChatComposer,
  type ChatSubmitPayload,
  type ChatThread,
  findPendingToolApproval,
  findWorkspaceByThreadId,
  ThreadMessage,
  useChatWorkspace,
} from '../../features/chat/index.ts'
import { AgentTraceView } from '../../features/trace/index.ts'

interface ChatPageProps {
  error?: string
  isLoading: boolean
  status: ChatStatus
  thread: ChatThread
  onStop: () => void
  onModelChange: (
    selection: Pick<ChatSubmitPayload, 'modelId' | 'providerId'>,
  ) => Promise<boolean>
  onSubmit: (payload: ChatSubmitPayload) => boolean
}

/** 保留完整会话工作台，并消费当前 Session 的真实消息与运行状态。 */
export function ChatPage({
  error,
  isLoading,
  onModelChange,
  onStop,
  onSubmit,
  status,
  thread,
}: ChatPageProps) {
  const [draft, setDraft] = useState('')
  const [capabilityError, setCapabilityError] = useState('')
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
  const initialModelKey = thread.providerId
    ? `${thread.providerId}:${thread.modelId}`
    : undefined
  const pendingApproval = findPendingToolApproval(
    thread.messages,
    Object.keys(approvalDecisions),
    approvedThreadTools,
  )

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

  const handleSubmit = (payload: ChatSubmitPayload) => {
    if (payload.attachments.length || payload.contextItems.length) {
      setCapabilityError('附件、Skills、MCP 和命令暂未接入 Agent Runtime。')
      return false
    }

    setCapabilityError('')
    return onSubmit(payload)
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
                {isLoading ? (
                  <p className="text-sm text-muted" role="status">
                    正在加载会话…
                  </p>
                ) : null}
                {!isLoading && thread.messages.length === 0 && !error ? (
                  <p className="text-sm text-muted">发送消息开始这段会话。</p>
                ) : null}
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
              error={capabilityError || error}
              fixedWorkspaceId={fixedWorkspaceId}
              initialModelId={thread.modelId}
              initialModelKey={initialModelKey}
              isDisabled={isLoading || !thread.modelId}
              status={status}
              value={draft}
              onModelChange={onModelChange}
              onStop={onStop}
              onSubmit={handleSubmit}
              onValueChange={setDraft}
            />
          )}
        </div>
      </div>
    </div>
  )
}
