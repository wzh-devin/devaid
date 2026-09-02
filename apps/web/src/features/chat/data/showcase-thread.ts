import type { ChatThread } from './chat-types.ts'

export const SHOWCASE_MARKDOWN = `下面是一段支持 **Markdown** 的精简回答：

\`\`\`ts
export type ChatStatus = "ready" | "streaming" | "submitted";
\`\`\`

- 仅负责展示的 Pro 组件
- 消息数组和 SDK 接入由你的应用管理
- 显式组合 \`ChatMessage\`、\`Markdown\` 和 \`Reasoning\``

export const SHOWCASE_THREAD: ChatThread = {
  archived: false,
  id: 'pro-ai-showcase',
  messages: [
    {
      id: 'showcase-1',
      role: 'user',
      text: '介绍一下 HeroUI Pro 的 AI 对话组件。',
    },
    {
      id: 'showcase-2',
      loaderLabel: '正在思考……',
      role: 'assistant',
      status: 'streaming',
      text: '正在思考……',
    },
    {
      id: 'showcase-3',
      role: 'user',
      text: '展示一下推理过程、Markdown 和代码高亮。',
    },
    {
      actions: 'full',
      avatar: { alt: '助手', fallback: 'AI' },
      id: 'showcase-4',
      markdown: SHOWCASE_MARKDOWN,
      reasoning: {
        defaultExpanded: false,
        duration: 4,
        steps: [
          {
            content:
              '检查了 Pro 示例中的 Markdown 区块记忆化和基于 Shiki 的代码块渲染。',
            label: '搜索',
          },
          {
            content:
              '将推理界面映射到 Reasoning，并使用 TextShimmer 与 ChatLoader 表示加载状态。',
            label: '规划',
          },
        ],
      },
      role: 'assistant',
      showAvatar: true,
    },
    {
      id: 'showcase-5',
      role: 'user',
      text: '展示流式和需要审批的工具调用。',
    },
    {
      id: 'showcase-5b',
      role: 'assistant',
      tools: [
        {
          argsText: '{\n  "query": "assistant-ui ToolFallback"\n}',
          kind: 'search',
          label: '已搜索 assistant-ui 工具组件文档',
          output: { hits: 12, top: 'ToolFallback' },
          state: 'output-available',
          toolName: 'searchDocs',
        },
        {
          argsText: '{\n  "path": "/docs/ui/tool-fallback"\n}',
          kind: 'read',
          label: '已读取 ToolFallback 页面',
          output: { title: 'ToolFallback', words: 420 },
          state: 'output-available',
          toolName: 'fetchPage',
        },
      ],
    },
    {
      id: 'showcase-5c',
      role: 'user',
      text: '如果工具调用需要审批呢？',
    },
    {
      id: 'showcase-5d',
      role: 'assistant',
      tools: [
        {
          approval: {
            description: '将向 team@acme.com 发送主题为“上线进展”的邮件。',
            title: '允许 AI 助手发送这封邮件吗？',
          },
          argsText: '{"to":"team@acme.com","subject":"上线进展"}',
          label: '发送邮件',
          state: 'requires-action',
          toolName: 'sendEmail',
        },
      ],
    },
    {
      id: 'showcase-6',
      role: 'user',
      text: '等待回答时，骨架屏加载效果是什么样的？',
    },
    {
      id: 'showcase-6b',
      loaderLabel: '正在加载回答',
      role: 'assistant',
      status: 'skeleton',
    },
    {
      id: 'showcase-7',
      role: 'user',
      text: '再展示一下媒体内容和精简操作。',
    },
    {
      actions: 'minimal',
      id: 'showcase-8',
      image: {
        alt: '组件架构图占位图片',
        src: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/images/egg.webp',
      },
      role: 'assistant',
      showAvatar: true,
      text: '助手消息可以包含媒体内容，并在正文下方显示一组精简操作。',
    },
    {
      id: 'showcase-9',
      role: 'user',
      text: '展示信息来源和文件附件。',
    },
    {
      attachments: [
        {
          mimeType: 'image/png',
          name: 'dashboard-wireframe.png',
          src: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/images/egg.webp',
        },
      ],
      id: 'showcase-9b',
      role: 'user',
      text: '你能从这个线框图中看出什么？',
    },
    {
      id: 'showcase-9c',
      role: 'assistant',
      sourceGroup: {
        label: '3 个来源',
        sources: [
          {
            description:
              'HeroUI Pro 为 React 提供仅负责展示的 AI 对话组合组件。',
            sourceType: 'url',
            title: 'HeroUI Pro',
            url: 'https://heroui.com',
          },
          {
            description: 'Pro 组件使用的基于插槽的样式工具。',
            sourceType: 'url',
            title: 'Tailwind Variants',
            url: 'https://tailwind-variants.org',
          },
          { sourceType: 'document', title: 'design-system-audit.pdf' },
        ],
      },
      text: '这个线框图采用常见的仪表盘框架，包含固定侧边栏、顶部栏，以及可滚动的卡片和图表内容区。',
    },
  ],
  modelId: 'gpt-5.4',
  preview:
    '展示 Markdown、Reasoning、工具调用、来源、附件、加载状态和消息操作的示例对话。',
  searchModeId: 'deep-search',
  title: 'Pro AI 组件展示',
  updatedAt: '刚刚',
  user: {
    avatar:
      'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg',
    email: 'darnell@email.com',
    name: 'Darnell Howe',
  },
}
