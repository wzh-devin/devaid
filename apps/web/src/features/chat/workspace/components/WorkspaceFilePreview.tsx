import { useEffect, useState } from 'react'
import { useAppLayout } from '@agile-avocation/ui-pro/app-layout'
import { CodeBlock } from '@agile-avocation/ui-pro/code-block'
import { Sheet } from '@agile-avocation/ui-pro/sheet'
import { Xmark } from '@gravity-ui/icons'
import { Button, Tooltip } from '@heroui/react'
import { FileTextIcon } from 'lucide-react'
import { readWorkspaceFile, type WorkspaceFileVo } from '../api/index.ts'
import { getFilePreviewLanguage } from '../data/file-preview-language.ts'

interface WorkspaceFilePreviewProps {
  path: string
  workspaceId: string
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '无法读取该文件。'

/** 在现有右侧栏中只读展示当前工作区文本文件。 */
export function WorkspaceFilePreview({
  path,
  workspaceId,
}: WorkspaceFilePreviewProps) {
  const appLayout = useAppLayout()
  const [file, setFile] = useState<WorkspaceFileVo>()
  const [error, setError] = useState('')
  const language = file
    ? getFilePreviewLanguage(file.path, file.size)
    : undefined

  useEffect(() => {
    const controller = new AbortController()
    void readWorkspaceFile(workspaceId, path, controller.signal)
      .then(setFile)
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === 'AbortError'
        ) {
          return
        }
        setError(errorMessage(requestError))
      })
    return () => controller.abort()
  }, [path, workspaceId])

  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-[45px] shrink-0 items-center gap-2 border-b border-divider px-4 text-sm font-medium">
        <FileTextIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted"
        />
        <Sheet.Heading
          className="truncate !text-sm !leading-5 !font-medium text-foreground"
          title={path}
        >
          {path}
        </Sheet.Heading>
        <Tooltip delay={0}>
          <Button
            isIconOnly
            aria-label="关闭文件预览"
            className="-mr-2 ml-auto"
            size="sm"
            variant="ghost"
            onPress={() => appLayout?.setAsideOpen(false)}
          >
            <Xmark className="size-3.5" />
          </Button>
          <Tooltip.Content placement="left">关闭文件预览</Tooltip.Content>
        </Tooltip>
      </header>

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain text-xs">
        {error ? (
          <p className="p-4 text-danger" role="alert">
            {error}
          </p>
        ) : file ? (
          file.content && language ? (
            <CodeBlock className="!m-0 min-h-full !rounded-none bg-transparent">
              <CodeBlock.Code code={file.content} language={language} />
            </CodeBlock>
          ) : file.content ? (
            <pre className="w-max min-w-full p-4 font-mono leading-5 whitespace-pre text-foreground">
              {file.content}
            </pre>
          ) : (
            <p className="p-4 text-muted">空文件</p>
          )
        ) : (
          <p className="p-4 text-muted" role="status">
            正在读取文件…
          </p>
        )}
      </div>
    </section>
  )
}
