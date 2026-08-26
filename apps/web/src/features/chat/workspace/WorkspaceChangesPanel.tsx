import { Sheet } from '@agile-avocation/ui-pro/sheet'
import { CaretDown, CodeCompare } from '@gravity-ui/icons'
import { Button, Disclosure } from '@heroui/react'

type DiffLineType = 'added' | 'context' | 'removed'

interface DiffLine {
  content: string
  newLineNumber: number | null
  oldLineNumber: number | null
  type: DiffLineType
}

interface WorkspaceDiffFile {
  additions: number
  deletions: number
  displayPath: string
  id: string
  lines: readonly DiffLine[]
  path: string
  status: 'A' | 'M'
}

const DIFF_LINE_CLASS_NAMES: Record<DiffLineType, string> = {
  added: 'bg-success/10',
  context: 'bg-background',
  removed: 'bg-danger/10',
}

const DIFF_GUTTER_CLASS_NAMES: Record<DiffLineType, string> = {
  added: 'border-success/20 text-success',
  context: 'border-divider text-muted',
  removed: 'border-danger/20 text-danger',
}

const DIFF_MARKERS: Record<DiffLineType, string> = {
  added: '+',
  context: ' ',
  removed: '-',
}

const README_DIFF_CONTENT = `# assistant-ui Elements 映射

本目录承载 AI 对话中的状态展示，并适配项目已有的 HeroUI 与 HeroUI Pro。

| 本地组件 | assistant-ui Element | 项目用途 |
| --- | --- | --- |
| \`GenerationLoader\` | Loading state | 等待与生成状态 |
| \`ThinkingIndicator\` | Thinking indicator | 当前思考状态 |
| \`ReasoningPanel\` | Reasoning panel | 可展开的推理过程 |
| \`WebSearch\` | Web search | 搜索过程与来源摘要 |
| \`ImageGeneration\` | Image generation | 图片生成状态 |
| \`TodoList\` | Todo list | 多步骤任务进度 |

## 现有消息组件

- 用户与助手消息外壳、附件、Markdown、来源和消息操作使用 HeroUI Pro。
- \`CodeBlock\` 使用 HeroUI Pro 的代码块组件。
- 单个与分组工具调用使用 HeroUI Pro 的工具调用组件。
- 输入框继续使用 HeroUI Pro \`PromptInput\`。

## 实现约定

- 每个 assistant-ui Element 独立成文件。

- 新增组件保持受控并使用语义颜色。`

const README_DIFF_LINES: readonly DiffLine[] = README_DIFF_CONTENT.split(
  '\n',
).map((content, index) => ({
  content,
  newLineNumber: index + 1,
  oldLineNumber: null,
  type: 'added',
}))

const MOCK_WORKSPACE_DIFF_FILES = [
  {
    additions: README_DIFF_LINES.length,
    deletions: 0,
    displayPath: '…components/ai/README.md',
    id: 'assistant-ui-readme',
    lines: README_DIFF_LINES,
    path: 'apps/web/src/components/ai/README.md',
    status: 'M',
  },
  {
    additions: 3,
    deletions: 2,
    displayPath: '…features/chat/workspace/WorkspaceChangesPanel.tsx',
    id: 'workspace-inspector',
    lines: [
      {
        content: 'import { Button, Tooltip } from "@heroui/react";',
        newLineNumber: 3,
        oldLineNumber: null,
        type: 'added',
      },
      {
        content: 'import { CaretDown, CodeCompare } from "@gravity-ui/icons";',
        newLineNumber: 4,
        oldLineNumber: null,
        type: 'added',
      },
      {
        content: 'import { motion, useReducedMotion } from "motion/react";',
        newLineNumber: 5,
        oldLineNumber: 4,
        type: 'context',
      },
      {
        content: 'const DIFF_MAX_HEIGHT = 640;',
        newLineNumber: null,
        oldLineNumber: 6,
        type: 'removed',
      },
      {
        content: 'const DIFF_MAX_HEIGHT = "min(70dvh, 48rem)";',
        newLineNumber: 7,
        oldLineNumber: null,
        type: 'added',
      },
    ],
    path: 'apps/web/src/features/chat/workspace/WorkspaceChangesPanel.tsx',
    status: 'M',
  },
] as const satisfies readonly WorkspaceDiffFile[]

/** 展示当前阶段的只读模拟文件变更和逐行 diff。 */
export function WorkspaceChangesPanel() {
  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-[45px] shrink-0 items-center gap-2 border-b border-divider px-4 text-sm font-medium">
        <CodeCompare className="size-4 shrink-0 text-muted" />
        <Sheet.Heading className="truncate !text-sm !leading-5 !font-medium text-foreground">
          变更
        </Sheet.Heading>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain text-xs">
        {MOCK_WORKSPACE_DIFF_FILES.map((file, fileIndex) => (
          <Disclosure
            className="border-b border-divider"
            defaultExpanded={fileIndex === 0}
            key={file.id}
          >
            <Disclosure.Heading>
              <Button
                className="h-10 min-h-0 w-full !transform-none justify-start gap-2 rounded-none px-3 text-xs"
                slot="trigger"
                type="button"
                variant="ghost"
              >
                <span className="shrink-0 font-semibold text-success">
                  {file.status}
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-left text-foreground"
                  title={file.path}
                >
                  {file.displayPath}
                </span>
                <span className="shrink-0 tabular-nums text-success">
                  +{file.additions}
                </span>
                <span className="shrink-0 tabular-nums text-danger">
                  -{file.deletions}
                </span>
                <span className="flex size-8 shrink-0 items-center justify-center">
                  <Disclosure.Indicator className="size-4 shrink-0 !-rotate-90 text-foreground data-[expanded]:!rotate-0">
                    <CaretDown />
                  </Disclosure.Indicator>
                </span>
              </Button>
            </Disclosure.Heading>
            <Disclosure.Content className="border-t border-divider **:data-[slot=disclosure-body]:p-0">
              <Disclosure.Body className="max-h-[min(70dvh,48rem)] overflow-auto p-0">
                <div
                  aria-label={`${file.path} 模拟变更内容`}
                  className="w-max min-w-full font-mono leading-6"
                  role="region"
                >
                  {file.lines.map((line, lineIndex) => (
                    <div
                      className={`grid grid-cols-[40px_40px_20px_minmax(520px,1fr)] ${DIFF_LINE_CLASS_NAMES[line.type]}`}
                      key={`${file.id}-${lineIndex}`}
                    >
                      <span
                        className={`border-r px-2 text-right tabular-nums select-none ${DIFF_GUTTER_CLASS_NAMES[line.type]}`}
                      >
                        {line.oldLineNumber}
                      </span>
                      <span
                        className={`border-r px-2 text-right tabular-nums select-none ${DIFF_GUTTER_CLASS_NAMES[line.type]}`}
                      >
                        {line.newLineNumber}
                      </span>
                      <span
                        className={`text-center select-none ${DIFF_GUTTER_CLASS_NAMES[line.type]}`}
                      >
                        {DIFF_MARKERS[line.type]}
                      </span>
                      <code className="pr-4 whitespace-pre text-foreground">
                        {line.content || ' '}
                      </code>
                    </div>
                  ))}
                </div>
              </Disclosure.Body>
            </Disclosure.Content>
          </Disclosure>
        ))}
      </div>
    </section>
  )
}
