import type { ComponentProps, ElementType } from 'react'
import { ChatLoader } from '@agile-avocation/ui-pro/chat-loader'
import { ChatMessage as ChatMessagePrimitive } from '@agile-avocation/ui-pro/chat-message'
import { ChatSource, ChatSources } from '@agile-avocation/ui-pro/chat-source'
import { CodeBlock } from '@agile-avocation/ui-pro/code-block'
import { Markdown, markdownVariants } from '@agile-avocation/ui-pro/markdown'
import { TextShimmer } from '@agile-avocation/ui-pro/text-shimmer'
import {
  FileTextIcon,
  Globe2Icon,
  PencilIcon,
  SearchIcon,
  SparklesIcon,
  TerminalIcon,
  WrenchIcon,
} from 'lucide-react'
import {
  ToolFallbackArgs,
  ToolFallbackContent,
  ToolFallbackError,
  ToolFallbackResult,
  ToolFallbackRoot,
  ToolFallbackTrigger,
} from '../../../components/assistant-ui/tool-fallback.tsx'
import type {
  ChatMessage,
  ChatMessageSource,
  ChatMessageTool,
} from '../chat-data.ts'
import { ChatAttachmentList } from './ChatAttachmentList.tsx'
import { ComposerContextBar } from './ComposerContextBar.tsx'
import type { ApprovalDecision } from './ApprovalPrompt.tsx'
import { MessageActions } from './MessageActions.tsx'
import { ReasoningPanel } from './ReasoningPanel.tsx'
import { getToolArgsText, getToolStatus } from '../tool-display.ts'

interface ThreadMessageProps {
  approvalDecisions?: Readonly<Record<string, ApprovalDecision>>
  message: ChatMessage
}

const markdownSlots = markdownVariants()

const toolIconMap: Record<
  NonNullable<ChatMessageTool['kind']>,
  ElementType
> = {
  browser: Globe2Icon,
  command: TerminalIcon,
  edit: PencilIcon,
  read: FileTextIcon,
  search: SearchIcon,
  skill: SparklesIcon,
  tool: WrenchIcon,
}

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

/** 将工具数据适配为官方普通展示或现有待审批展示。 */
const renderTool = (
  tool: ChatMessageTool,
  key: string,
  approvalDecision?: ApprovalDecision,
) => {
  if (tool.state === 'requires-action') {
    const approvalLabel =
      approvalDecision === 'approve-once'
        ? '已允许一次'
        : approvalDecision === 'approve-thread'
          ? '已允许此对话'
          : approvalDecision === 'reject'
            ? '已拒绝'
            : '等待审批'

    return (
      <div
        key={key}
        className="flex min-h-7 items-center gap-2 text-sm text-muted"
      >
        <WrenchIcon className="size-4 shrink-0" />
        <span>
          {approvalLabel} · {tool.label ?? tool.toolName}
        </span>
      </div>
    )
  }

  const status = getToolStatus(tool)
  return (
    <ToolFallbackRoot key={key} defaultOpen={status.type === 'running'}>
      <ToolFallbackTrigger
        icon={toolIconMap[tool.kind ?? 'tool']}
        label={tool.label}
        status={status}
        toolName={tool.toolName}
      />
      <ToolFallbackContent>
        <ToolFallbackError status={status} />
        <ToolFallbackArgs argsText={getToolArgsText(tool)} />
        <ToolFallbackResult result={tool.output} />
      </ToolFallbackContent>
    </ToolFallbackRoot>
  )
}

/** 根据 mock 消息契约渲染文本、富媒体、推理、工具与来源状态。 */
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

        {message.tools?.map((tool, index) =>
          renderTool(
            tool,
            `${tool.toolName}-${index}`,
            approvalDecisions?.[`${message.id}:${index}`],
          ),
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
