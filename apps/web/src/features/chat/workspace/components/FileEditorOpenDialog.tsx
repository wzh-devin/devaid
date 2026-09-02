import { Button, Modal } from '@heroui/react'

import type { FileEditorSelectionVo } from '../api/index.ts'

interface FileEditorOpenDialogProps {
  editor?: FileEditorSelectionVo
  error?: string
  isPending: boolean
  path: string
  onClose: () => void
  onOpen: (remember: boolean) => void
  onReselect: () => void
}

/** 在应用已经由系统选择后，让用户决定仅本次使用还是保存为默认。 */
export function FileEditorOpenDialog({
  editor,
  error,
  isPending,
  onClose,
  onOpen,
  onReselect,
  path,
}: FileEditorOpenDialogProps) {
  return (
    <Modal.Backdrop
      isDismissable={!isPending}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 backdrop-blur-sm"
      isOpen
      onOpenChange={(open) => {
        if (!open && !isPending) onClose()
      }}
    >
      <Modal.Container
        className="w-full max-w-[calc(100vw-24px)] p-0 sm:max-w-[480px]"
        placement="center"
      >
        <Modal.Dialog className="w-full max-w-none gap-0 overflow-hidden rounded-3xl bg-surface p-0 shadow-2xl outline-none">
          <Modal.CloseTrigger
            aria-label="关闭本地应用选择"
            className={`bg-transparent text-foreground hover:bg-surface-secondary ${isPending ? 'pointer-events-none opacity-50' : ''}`}
          />
          <Modal.Header className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
            <Modal.Heading className="text-lg font-medium text-foreground">
              使用本地应用打开
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="!m-0 !w-full space-y-4 px-5 py-0 text-sm sm:px-6">
            <div>
              <p className="text-muted">文件</p>
              <p className="mt-1 break-all text-foreground">{path}</p>
            </div>
            {editor ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-secondary px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-muted">打开的应用</p>
                  <p className="mt-0.5 truncate font-medium text-foreground">
                    {editor.name}
                  </p>
                </div>
                <Button
                  className="shrink-0"
                  isDisabled={isPending}
                  type="button"
                  variant="ghost"
                  onPress={onReselect}
                >
                  重新选择
                </Button>
              </div>
            ) : null}
            {error ? (
              <p className="text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </Modal.Body>
          <Modal.Footer className="flex flex-wrap justify-end gap-2 px-5 pt-5 pb-5 sm:px-6 sm:pb-6">
            <Button
              isDisabled={isPending}
              type="button"
              variant="outline"
              onPress={onClose}
            >
              取消
            </Button>
            {editor ? (
              <>
                <Button
                  isDisabled={isPending}
                  type="button"
                  variant="secondary"
                  onPress={() => onOpen(false)}
                >
                  仅本次打开
                </Button>
                <Button
                  className="bg-foreground text-background hover:bg-foreground/90"
                  isDisabled={isPending}
                  type="button"
                  onPress={() => onOpen(true)}
                >
                  {isPending ? '正在打开…' : '设为默认并打开'}
                </Button>
              </>
            ) : error ? (
              <Button
                isDisabled={isPending}
                type="button"
                variant="secondary"
                onPress={onReselect}
              >
                重新选择应用
              </Button>
            ) : null}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
