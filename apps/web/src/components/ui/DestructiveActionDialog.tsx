import type { ReactNode } from 'react'
import { Button, Modal } from '@heroui/react'

interface DestructiveActionDialogProps {
  confirmLabel: string
  description: ReactNode
  error?: string
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
}

/** 为不可恢复操作提供一致的二次确认和提交锁。 */
export function DestructiveActionDialog({
  confirmLabel,
  description,
  error,
  isPending,
  onClose,
  onConfirm,
  title,
}: DestructiveActionDialogProps) {
  return (
    <Modal.Backdrop
      isDismissable={!isPending}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 backdrop-blur-sm"
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen && !isPending) onClose()
      }}
    >
      <Modal.Container
        className="w-full max-w-[calc(100vw-24px)] p-0 sm:max-w-[440px]"
        placement="center"
      >
        <Modal.Dialog className="w-full max-w-none gap-0 overflow-hidden rounded-3xl bg-surface p-0 shadow-2xl outline-none">
          <Modal.CloseTrigger
            aria-label="关闭删除确认"
            className={`bg-transparent text-foreground hover:bg-surface-secondary ${isPending ? 'pointer-events-none opacity-50' : ''}`}
          />
          <Modal.Header className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
            <Modal.Heading className="text-lg font-medium text-foreground">
              {title}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="!m-0 !w-full px-5 py-0 text-sm leading-6 text-muted sm:px-6">
            {description}
            {error ? (
              <p className="mt-3 text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </Modal.Body>
          <Modal.Footer className="flex justify-end gap-2 px-5 pt-5 pb-5 sm:px-6 sm:pb-6">
            <Button
              isDisabled={isPending}
              type="button"
              variant="outline"
              onPress={onClose}
            >
              取消
            </Button>
            <Button
              isDisabled={isPending}
              type="button"
              variant="danger"
              onPress={onConfirm}
            >
              {isPending ? '正在删除…' : confirmLabel}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
