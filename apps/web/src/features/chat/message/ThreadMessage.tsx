import { ChatLoader } from '@agile-avocation/ui-pro/chat-loader'
import { ChatMessage as ChatMessagePrimitive } from '@agile-avocation/ui-pro/chat-message'
import { ChatSources } from '@agile-avocation/ui-pro/chat-source'
import { TextShimmer } from '@agile-avocation/ui-pro/text-shimmer'
import type { ChatMessage } from '../data/chat-types.ts'
import { ChatAttachmentList } from '../composer/ChatAttachmentList.tsx'
import { ComposerContextBar } from '../composer/ComposerContextBar.tsx'
import type { ApprovalDecision } from './ApprovalPrompt.tsx'
import { MessageActions } from './MessageActions.tsx'
import { MessageMarkdown } from './MessageMarkdown.tsx'
import { MessageSource } from './MessageSource.tsx'
import { MessageTool } from './MessageTool.tsx'
import { ReasoningPanel } from './ReasoningPanel.tsx'

interface ThreadMessageProps {
  approvalDecisions?: Readonly<Record<string, ApprovalDecision>>
  message: ChatMessage
}

/** 根据消息契约组合用户消息或助手消息。 */
export function ThreadMessage({
  approvalDecisions,
  message,
}: ThreadMessageProps) {
  if (message.role === 'user') {
    return (
      <ChatMessagePrimitive.User>
        {message.contextItems?.length ? (
          <ComposerContextBar
            className="mb-2 justify-end"
            items={message.contextItems}
          />
        ) : null}
        {message.attachments?.length ? (
          <ChatAttachmentList
            attachments={message.attachments}
            className="mb-2"
          />
        ) : null}
        <ChatMessagePrimitive.Bubble>
          <ChatMessagePrimitive.Content>
            {message.text}
          </ChatMessagePrimitive.Content>
        </ChatMessagePrimitive.Bubble>
      </ChatMessagePrimitive.User>
    )
  }

  return (
    <ChatMessagePrimitive.Assistant>
      <ChatMessagePrimitive.Avatar
        alt={message.avatar?.alt ?? '助手'}
        fallback={message.avatar?.fallback ?? 'AI'}
        show={message.showAvatar ?? false}
        src={message.avatar?.src}
      />

      <ChatMessagePrimitive.Body>
        {message.reasoning ? (
          <ReasoningPanel reasoning={message.reasoning} />
        ) : null}

        {message.tools?.map((tool, index) => (
          <MessageTool
            key={`${tool.toolName}-${index}`}
            approvalDecision={approvalDecisions?.[`${message.id}:${index}`]}
            tool={tool}
          />
        ))}

        {message.status === 'streaming' ? (
          <>
            {message.text ? <TextShimmer>{message.text}</TextShimmer> : null}
            <ChatLoader.Dots />
          </>
        ) : null}

        {message.status === 'skeleton' ? (
          <ChatLoader.Skeleton label={message.loaderLabel ?? '正在加载回答'} />
        ) : null}

        {message.status !== 'streaming' && message.status !== 'skeleton' ? (
          <>
            {message.markdown || message.text ? (
              <ChatMessagePrimitive.Content>
                <MessageMarkdown>
                  {message.markdown || message.text || ''}
                </MessageMarkdown>
              </ChatMessagePrimitive.Content>
            ) : null}

            {message.listItems?.length ? (
              <ChatMessagePrimitive.Content>
                <ol className="list-decimal space-y-1 pl-6">
                  {message.listItems.map((listItem) => (
                    <li key={listItem}>{listItem}</li>
                  ))}
                </ol>
              </ChatMessagePrimitive.Content>
            ) : null}

            {message.image ? (
              <ChatMessagePrimitive.Media>
                <img
                  alt={message.image.alt}
                  className="aspect-square w-full max-w-[341px] rounded-2xl object-cover"
                  src={message.image.src}
                />
              </ChatMessagePrimitive.Media>
            ) : null}

            {message.sourceGroup ? (
              <ChatSources defaultExpanded={false}>
                <ChatSources.Trigger>
                  {message.sourceGroup.label}
                </ChatSources.Trigger>
                <ChatSources.Content>
                  <ChatSources.List>
                    {message.sourceGroup.sources.map((source, index) => (
                      <MessageSource
                        key={
                          source.sourceType === 'url'
                            ? `${source.url}-${index}`
                            : `${source.title}-${index}`
                        }
                        source={source}
                      />
                    ))}
                  </ChatSources.List>
                </ChatSources.Content>
              </ChatSources>
            ) : null}

            {message.sources?.map((source, index) => (
              <MessageSource key={`${source.title}-${index}`} source={source} />
            ))}

            {message.actions ? (
              <MessageActions variant={message.actions} />
            ) : null}
          </>
        ) : null}
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  )
}
