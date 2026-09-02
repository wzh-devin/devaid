import { useState } from 'react'
import { ArrowRotateLeft, TrashBin } from '@gravity-ui/icons'
import { Button } from '@heroui/react'
import { DestructiveActionDialog } from '../../../../components/index.ts'
import type { ArchivedConversation } from '../types/settings-dialog.ts'

interface ArchivedConversationsSectionProps {
  conversations: readonly ArchivedConversation[]
  onClear: () => Promise<string>
  onDelete: (conversationId: string) => Promise<string>
  onRestore: (conversationId: string) => Promise<string>
  onView: (conversationId: string) => void
}

type DeleteConfirmation =
  { kind: 'all' } | { conversation: ArchivedConversation; kind: 'conversation' }

/** 查看归档会话，并允许将它恢复到原工作区。 */
export function ArchivedConversationsSection({
  conversations,
  onClear,
  onDelete,
  onRestore,
  onView,
}: ArchivedConversationsSectionProps) {
  const [restoringId, setRestoringId] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmation, setConfirmation] = useState<DeleteConfirmation>()
  const [error, setError] = useState('')

  const restore = async (conversationId: string) => {
    setRestoringId(conversationId)
    setError('')
    const nextError = await onRestore(conversationId)
    setError(nextError)
    setRestoringId('')
  }

  /** 执行当前确认的单条或批量永久删除。 */
  const deleteConfirmed = async () => {
    if (!confirmation) return
    setIsDeleting(true)
    setError('')
    const nextError =
      confirmation.kind === 'all'
        ? await onClear()
        : await onDelete(confirmation.conversation.id)
    setError(nextError)
    setIsDeleting(false)
    setConfirmation(undefined)
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-medium text-foreground">已归档对话</h3>
          <p className="mt-1 text-sm text-muted">
            归档对话不会出现在侧边栏，恢复后会回到原工作区。
          </p>
        </div>
        {conversations.length > 0 ? (
          <Button
            className="shrink-0"
            isDisabled={Boolean(restoringId) || isDeleting}
            size="sm"
            variant="danger"
            onPress={() => setConfirmation({ kind: 'all' })}
          >
            <TrashBin className="size-4" />
            清空全部
          </Button>
        ) : null}
      </div>

      {conversations.length > 0 ? (
        <div className="divide-y divide-divider border-y border-divider">
          {conversations.map((conversation) => (
            <div
              className="flex flex-wrap items-center gap-3 py-3"
              key={conversation.id}
            >
              <div className="min-w-48 flex-1">
                <span className="block truncate text-sm text-foreground">
                  {conversation.title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted">
                  {conversation.workspaceLabel} · {conversation.updatedAt}
                </span>
              </div>
              <Button
                aria-label={`查看对话：${conversation.title}`}
                className="shrink-0"
                size="sm"
                variant="ghost"
                onPress={() => onView(conversation.id)}
              >
                查看
              </Button>
              <Button
                aria-label={`永久删除对话：${conversation.title}`}
                className="shrink-0"
                isDisabled={Boolean(restoringId) || isDeleting}
                size="sm"
                variant="danger-soft"
                onPress={() =>
                  setConfirmation({ conversation, kind: 'conversation' })
                }
              >
                <TrashBin className="size-4" />
                永久删除
              </Button>
              <Button
                aria-label={`恢复对话：${conversation.title}`}
                className="shrink-0"
                isDisabled={Boolean(restoringId)}
                size="sm"
                variant="secondary"
                onPress={() => void restore(conversation.id)}
              >
                <ArrowRotateLeft className="size-4" />
                {restoringId === conversation.id ? '恢复中…' : '恢复'}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="border-y border-divider py-8 text-center text-sm text-muted">
          暂无已归档对话
        </p>
      )}

      {error ? (
        <p aria-live="polite" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {confirmation ? (
        <DestructiveActionDialog
          confirmLabel={confirmation.kind === 'all' ? '清空全部' : '永久删除'}
          description={
            confirmation.kind === 'all'
              ? `将永久删除当前全部 ${conversations.length} 条归档对话及其历史记录。此操作无法撤销。`
              : `将永久删除“${confirmation.conversation.title}”及其全部历史记录。此操作无法撤销。`
          }
          isPending={isDeleting}
          title={confirmation.kind === 'all' ? '清空归档对话' : '永久删除对话'}
          onClose={() => setConfirmation(undefined)}
          onConfirm={() => void deleteConfirmed()}
        />
      ) : null}
    </section>
  )
}
