import type { ComponentProps } from 'react'
import { ChainOfThought } from '@agile-avocation/ui-pro/chain-of-thought'
import { ChatLoader } from '@agile-avocation/ui-pro/chat-loader'
import { ChatMessage as ChatMessagePrimitive } from '@agile-avocation/ui-pro/chat-message'
import { ChatSource, ChatSources } from '@agile-avocation/ui-pro/chat-source'
import { ChatTool, ChatToolGroup } from '@agile-avocation/ui-pro/chat-tool'
import { CodeBlock } from '@agile-avocation/ui-pro/code-block'
import { Markdown, markdownVariants } from '@agile-avocation/ui-pro/markdown'
import { TextShimmer } from '@agile-avocation/ui-pro/text-shimmer'
import type {
  ChatMessage,
  ChatMessageSource,
  ChatMessageTool,
} from '../chat-data.ts'
import { ChatAttachmentList } from './ChatAttachmentList.tsx'
import { MessageActions } from './MessageActions.tsx'

interface ThreadMessageProps {
  message: ChatMessage
}

const markdownSlots = markdownVariants()

/** 保留 UI Pro Markdown 渲染，仅将代码复制按钮的无障碍名称改为中文。 */
const LOCALIZED_MARKDOWN_COMPONENTS = {
  code: ({ children, className, node, ...props }) => {
    const isInline =
      !node?.position?.start.line ||
      node.position.start.line === node.position.end.line

    if (isInline) {
      return (
        <code
          className={`${markdownSlots.inlineCode()} ${className ?? ''}`.trim()}
          {...props}
        >
          {children}
        </code>
      )
    }

    const code = String(children ?? '').replace(/\n$/, '')
    const language = className?.match(/language-(\w+)/)?.[1] ?? 'plaintext'

    return (
      <CodeBlock>
        <CodeBlock.Header>
          <span className="text-xs text-muted uppercase">{language}</span>
          <CodeBlock.CopyButton aria-label="复制代码" code={code} />
        </CodeBlock.Header>
        <CodeBlock.Code code={code} language={language} />
      </CodeBlock>
    )
  },
} satisfies NonNullable<ComponentProps<typeof Markdown>['components']>

/** 将 URL 与本地文档来源适配为对应的 UI Pro source。 */
const renderSource = (source: ChatMessageSource, key: string) => {
  if (source.sourceType === 'url') {
    return (
      <ChatSource
        key={key}
        description={source.description}
        href={source.url}
        sourceType="url"
        title={source.title}
      />
    )
  }

  return <ChatSource key={key} sourceType="document" title={source.title} />
}

/** 将工具状态适配为普通工具调用或待审批工具调用。 */
const renderTool = (tool: ChatMessageTool, prefix: string, key: string) => {
  if (tool.state === 'requires-action') {
    return (
      <ChatTool
        key={key}
        defaultExpanded
        approveLabel="批准"
        argsText={tool.argsText}
        input={tool.input}
        output={tool.output}
        rejectLabel="拒绝"
        state={tool.state}
        toolName={tool.toolName}
        triggerPrefix="需要审批 "
        onApprove={() => undefined}
        onReject={() => undefined}
      />
    )
  }

  return (
    <ChatTool
      key={key}
      argsText={tool.argsText}
      defaultExpanded={tool.state === 'input-streaming'}
      errorText={tool.errorText}
      input={tool.input}
      output={tool.output}
      state={tool.state}
      toolName={tool.toolName}
      triggerPrefix={`${prefix} `}
    />
  )
}

/** 根据 mock 消息契约渲染文本、富媒体、推理、工具与来源状态。 */
export function ThreadMessage({ message }: ThreadMessageProps) {
  if (message.role === 'user') {
    return (
      <ChatMessagePrimitive.User>
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
          <ChainOfThought
            defaultExpanded={message.reasoning.defaultExpanded ?? false}
          >
            <ChainOfThought.Trigger>
              {message.reasoning.trigger}
            </ChainOfThought.Trigger>
            <ChainOfThought.Content>
              <ChainOfThought.Steps>
                {message.reasoning.steps.map((step) => (
                  <ChainOfThought.Step key={step.label} label={step.label}>
                    {step.content}
                  </ChainOfThought.Step>
                ))}
              </ChainOfThought.Steps>
            </ChainOfThought.Content>
          </ChainOfThought>
        ) : null}

        {message.toolGroup ? (
          <ChatToolGroup
            active={message.toolGroup.active}
            defaultExpanded={false}
          >
            <ChatToolGroup.Trigger>
              {message.toolGroup.label}
            </ChatToolGroup.Trigger>
            <ChatToolGroup.Content>
              {message.toolGroup.tools.map((tool, index) =>
                renderTool(tool, '已使用', `${tool.toolName}-${index}`),
              )}
            </ChatToolGroup.Content>
          </ChatToolGroup>
        ) : null}

        {message.tools?.map((tool, index) =>
          renderTool(tool, '已使用', `${tool.toolName}-${index}`),
        )}

        {message.status === 'streaming' ? (
          <>
            {message.text ? <TextShimmer>{message.text}</TextShimmer> : null}
            <ChatLoader.Dots />
          </>
        ) : null}

        {message.status === 'skeleton' ? (
          <ChatLoader.Skeleton
            label={message.loaderLabel ?? '正在加载回答'}
          />
        ) : null}

        {message.status !== 'streaming' && message.status !== 'skeleton' ? (
          <>
            {message.markdown ? (
              <ChatMessagePrimitive.Content>
                <Markdown components={LOCALIZED_MARKDOWN_COMPONENTS}>
                  {message.markdown}
                </Markdown>
              </ChatMessagePrimitive.Content>
            ) : message.text ? (
              <ChatMessagePrimitive.Content>
                <Markdown components={LOCALIZED_MARKDOWN_COMPONENTS}>
                  {message.text}
                </Markdown>
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
                    {message.sourceGroup.sources.map((source, index) =>
                      renderSource(
                        source,
                        source.sourceType === 'url'
                          ? `${source.url}-${index}`
                          : `${source.title}-${index}`,
                      ),
                    )}
                  </ChatSources.List>
                </ChatSources.Content>
              </ChatSources>
            ) : null}

            {message.sources?.map((source, index) =>
              renderSource(source, `${source.title}-${index}`),
            )}

            {message.actions ? (
              <MessageActions variant={message.actions} />
            ) : null}
          </>
        ) : null}
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  )
}
