import { FileText, Xmark } from '@gravity-ui/icons'
import { Button } from '@heroui/react'

interface ChatAttachmentListItem {
  id?: string
  mimeType?: string
  name: string
  src?: string
}

interface ChatAttachmentListProps {
  attachments: readonly ChatAttachmentListItem[]
  className?: string
  onRemove?: (attachment: ChatAttachmentListItem) => void
}

const isImageAttachment = (attachment: ChatAttachmentListItem) =>
  Boolean(attachment.src && attachment.mimeType?.startsWith('image/'))

/** 渲染消息或草稿中的附件，并在允许时提供移除操作。 */
export function ChatAttachmentList({
  attachments,
  className = '',
  onRemove,
}: ChatAttachmentListProps) {
  if (attachments.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {attachments.map((attachment, index) => (
        <div
          key={attachment.id ?? `${attachment.name}-${index}`}
          className="flex h-10 max-w-64 min-w-0 items-center gap-2 rounded-lg border border-border bg-default/60 px-1.5 pr-2 text-foreground"
        >
          {isImageAttachment(attachment) ? (
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
            {attachment.name}
          </span>
          {onRemove ? (
            <Button
              isIconOnly
              aria-label={`移除附件：${attachment.name}`}
              className="-mr-1 size-6 min-w-6"
              size="sm"
              variant="ghost"
              onPress={() => onRemove(attachment)}
            >
              <Xmark className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  )
}
