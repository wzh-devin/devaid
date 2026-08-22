import { useState } from 'react'
import { ChatConversation } from '@agile-avocation/ui-pro/chat-conversation'
import type { ChatThread } from '../../features/chat/chat-data.ts'
import { ChatComposer } from '../../features/chat/components/ChatComposer.tsx'
import { ThreadMessage } from '../../features/chat/components/ThreadMessage.tsx'

interface ChatPageProps {
  thread: ChatThread
}

/** 渲染 Recent 会话消息，并复用聊天输入区进行前端模拟发送。 */
export function ChatPage({ thread }: ChatPageProps) {
  const [draft, setDraft] = useState('')

  return (
    <div className="flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden">
      <ChatConversation className="min-h-0 flex-1">
        <ChatConversation.Content className="flex flex-col">
          <div className="mx-auto flex w-full max-w-[714px] flex-col gap-8 px-4 pt-10 pb-6">
            {thread.messages.map((message) => (
              <ThreadMessage key={message.id} message={message} />
            ))}
          </div>
          <ChatConversation.ScrollAnchor />
        </ChatConversation.Content>
      </ChatConversation>

      <div className="shrink-0 bg-background px-4 pt-3 pb-4">
        <div className="mx-auto w-full max-w-[714px]">
          <ChatComposer
            initialModelId={thread.modelId}
            value={draft}
            onValueChange={setDraft}
          />
        </div>
      </div>
    </div>
  )
}
