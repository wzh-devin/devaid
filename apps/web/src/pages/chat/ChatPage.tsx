import { useState } from 'react'
import { ChatConversation } from '@agile-avocation/ui-pro/chat-conversation'
import { Tabs } from '@heroui/react'
import type { ChatThread } from '../../features/chat/chat-data.ts'
import { ChatComposer } from '../../features/chat/components/ChatComposer.tsx'
import { ThreadMessage } from '../../features/chat/components/ThreadMessage.tsx'
import { useChatWorkspace } from '../../features/chat/workspace-context.ts'
import { findWorkspaceByThreadId } from '../../features/chat/workspace-data.ts'
import { AgentTraceView } from '../../features/trace/index.ts'

interface ChatPageProps {
  thread: ChatThread
}

/** 渲染 Recent 会话消息，并复用聊天输入区进行前端模拟发送。 */
export function ChatPage({ thread }: ChatPageProps) {
  const [draft, setDraft] = useState('')
  const { selectedWorkspaceId, workspaces } = useChatWorkspace()
  const [fixedWorkspaceId] = useState(
    () =>
      findWorkspaceByThreadId(workspaces, thread.id)?.id ??
      selectedWorkspaceId,
  )

  return (
    <div className="flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden min-[769px]:h-svh">
      <Tabs
        className="flex min-h-0 flex-1 flex-col"
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

        <Tabs.Panel
          className="min-h-0 flex-1 overflow-hidden p-0"
          id="conversation"
        >
          <ChatConversation className="h-full min-h-0">
            <ChatConversation.Content className="flex flex-col">
              <div className="mx-auto flex w-full max-w-[714px] flex-col gap-8 px-4 pt-10 pb-6">
                {thread.messages.map((message) => (
                  <ThreadMessage key={message.id} message={message} />
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
          <ChatComposer
            fixedWorkspaceId={fixedWorkspaceId}
            initialModelId={thread.modelId}
            value={draft}
            onValueChange={setDraft}
          />
        </div>
      </div>
    </div>
  )
}
