import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatStatus } from '@agile-avocation/ui-pro/prompt-input'
import { PromptInput } from '@agile-avocation/ui-pro/prompt-input'
import { FileText, Paperclip, Xmark } from '@gravity-ui/icons'
import { Button } from '@heroui/react'
import { SelectMenu } from '../../../components/ui/SelectMenu.tsx'
import { CHAT_MODELS } from '../chat-data.ts'

interface PendingAttachment {
  file: File
  id: string
  src?: string
}

export interface ChatSubmitPayload {
  attachments: readonly File[]
  message: string
  modelId: string
}

interface ChatComposerProps {
  className?: string
  initialModelId?: string
  value: string
  onSubmit?: (payload: ChatSubmitPayload) => void
  onValueChange: (value: string) => void
}

const createAttachmentId = (file: File) =>
  `${file.name}-${file.lastModified}-${crypto.randomUUID()}`

const revokeAttachmentUrl = (attachment: PendingAttachment) => {
  if (attachment.src?.startsWith('blob:')) {
    URL.revokeObjectURL(attachment.src)
  }
}

/** 管理消息草稿、模型、附件以及前端模拟发送状态。 */
export function ChatComposer({
  className,
  initialModelId = CHAT_MODELS[0]?.id ?? 'gpt-5.4',
  onSubmit,
  onValueChange,
  value,
}: ChatComposerProps) {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [modelId, setModelId] = useState(initialModelId)
  const [status, setStatus] = useState<ChatStatus>('ready')
  const attachmentsRef = useRef<PendingAttachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timersRef = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = []
  }, [])

  useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])

  useEffect(() => {
    return () => {
      clearTimers()
      attachmentsRef.current.forEach(revokeAttachmentUrl)
    }
  }, [clearTimers])

  const handleStop = () => {
    clearTimers()
    setStatus('ready')
  }

  const handleSubmit = () => {
    const message = value.trim()

    if (status !== 'ready' || (!message && attachments.length === 0)) {
      return
    }

    onSubmit?.({
      attachments: attachments.map(({ file }) => file),
      message,
      modelId,
    })

    attachments.forEach(revokeAttachmentUrl)
    setAttachments([])
    onValueChange('')
    setStatus('submitted')
    clearTimers()

    timersRef.current.push(
      window.setTimeout(() => setStatus('streaming'), 350),
      window.setTimeout(() => setStatus('ready'), 1600),
    )
  }

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? [])

    if (files.length > 0) {
      setAttachments((current) => [
        ...current,
        ...files.map((file) => ({
          file,
          id: createAttachmentId(file),
          src: file.type.startsWith('image/')
            ? URL.createObjectURL(file)
            : undefined,
        })),
      ])
    }

    event.currentTarget.value = ''
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments((current) => {
      const removed = current.find((attachment) => attachment.id === id)
      if (removed) revokeAttachmentUrl(removed)
      return current.filter((attachment) => attachment.id !== id)
    })
  }

  const isGenerating = status === 'submitted' || status === 'streaming'
  const canSend = Boolean(value.trim() || attachments.length)

  return (
    <PromptInput
      className={className ?? 'w-full'}
      status={status}
      value={value}
      variant="primary"
      onStop={handleStop}
      onSubmit={handleSubmit}
      onValueChange={onValueChange}
    >
      <PromptInput.Shell>
        <PromptInput.Content>
          {attachments.length > 0 ? (
            <PromptInput.Attachments>
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex h-10 max-w-64 min-w-0 items-center gap-2 rounded-lg border border-border bg-default/60 px-1.5 pr-2 text-foreground"
                  >
                    {attachment.src ? (
                      <img
                        alt=""
                        className="size-7 shrink-0 rounded-md object-cover"
                        src={attachment.src}
                      />
                    ) : (
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background text-muted">
                        <FileText className="size-4" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {attachment.file.name}
                    </span>
                    <Button
                      isIconOnly
                      aria-label={`移除附件：${attachment.file.name}`}
                      className="-mr-1 size-6 min-w-6"
                      size="sm"
                      variant="ghost"
                      onPress={() => handleRemoveAttachment(attachment.id)}
                    >
                      <Xmark className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </PromptInput.Attachments>
          ) : null}

          <PromptInput.TextArea
            aria-label="消息输入"
            placeholder="你想了解什么？"
          />
        </PromptInput.Content>

        <PromptInput.Toolbar>
          <PromptInput.ToolbarStart>
            <input
              ref={fileInputRef}
              aria-hidden
              multiple
              className="sr-only"
              disabled={isGenerating}
              tabIndex={-1}
              type="file"
              onChange={handleFileInputChange}
            />
            <PromptInput.Action
              aria-label="添加附件"
              isDisabled={isGenerating}
              tooltip="添加附件"
              onPress={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </PromptInput.Action>

            <SelectMenu
              ariaLabel="模型"
              className="w-auto min-w-32 shrink-0"
              isDisabled={isGenerating}
              options={CHAT_MODELS}
              triggerClassName="w-full"
              value={modelId}
              onChange={setModelId}
            />
          </PromptInput.ToolbarStart>

          <PromptInput.ToolbarEnd>
            <PromptInput.Send
              aria-label={isGenerating ? '停止生成' : '发送消息'}
              isDisabled={!canSend && !isGenerating}
            />
          </PromptInput.ToolbarEnd>
        </PromptInput.Toolbar>
      </PromptInput.Shell>

      <PromptInput.Footer>
        AI 可能会出错，请核对重要信息。
      </PromptInput.Footer>
    </PromptInput>
  )
}
