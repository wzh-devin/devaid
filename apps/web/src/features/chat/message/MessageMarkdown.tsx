import type { ComponentProps } from 'react'
import { CodeBlock } from '@agile-avocation/ui-pro/code-block'
import { Markdown, markdownVariants } from '@agile-avocation/ui-pro/markdown'

const markdownSlots = markdownVariants()
const LOCALIZED_COMPONENTS = {
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

interface MessageMarkdownProps {
  children: string
}

/** 使用 UI Pro 渲染消息 Markdown，并提供中文复制名称。 */
export function MessageMarkdown({ children }: MessageMarkdownProps) {
  return <Markdown components={LOCALIZED_COMPONENTS}>{children}</Markdown>
}
