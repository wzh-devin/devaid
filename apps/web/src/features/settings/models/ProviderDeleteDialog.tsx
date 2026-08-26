import { Button, Modal } from '@heroui/react'
import type { ModelProvider } from './provider-models.ts'

interface ProviderDeleteDialogProps {
  provider: ModelProvider
  onClose: () => void
  onConfirm: () => void
}

/** 确认从当前页面会话中删除模型提供方。 */
export function ProviderDeleteDialog({
  provider,
  onClose,
  onConfirm,
}: ProviderDeleteDialogProps) {
  return (
    <Modal.Backdrop
      isDismissable
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 backdrop-blur-sm"
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <Modal.Container
        className="w-full max-w-[calc(100vw-24px)] p-0 sm:max-w-[420px]"
        placement="center"
      >
        <Modal.Dialog className="w-full max-w-none gap-0 overflow-hidden rounded-3xl bg-surface p-0 shadow-2xl outline-none">
          <Modal.CloseTrigger
            aria-label="关闭删除确认"
            className="bg-transparent text-foreground hover:bg-surface-secondary"
          />
          <Modal.Header className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
            <Modal.Heading className="text-lg font-medium text-foreground">
              删除提供方
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="!m-0 !w-full px-5 py-0 text-sm leading-6 text-muted sm:px-6">
            删除“{provider.name}”后，其 API
            地址、协议和模型目录将从本次页面会话中移除。
          </Modal.Body>
          <Modal.Footer className="flex justify-end gap-2 px-5 pt-5 pb-5 sm:px-6 sm:pb-6">
            <Button type="button" variant="outline" onPress={onClose}>
              取消
            </Button>
            <Button type="button" variant="danger" onPress={onConfirm}>
              确认删除
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
