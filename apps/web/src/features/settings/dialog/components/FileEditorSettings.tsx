import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'

import {
  clearDefaultFileEditor,
  getFileEditorPreference,
  selectFileEditor,
  setDefaultFileEditor,
} from '../../../chat/workspace/index.ts'

/** 管理 Server 所在电脑的默认文件编辑器。 */
export function FileEditorSettings() {
  const [editorName, setEditorName] = useState<string>()
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    let active = true
    void getFileEditorPreference()
      .then((preference) => {
        if (!active) return
        setEditorName(preference.defaultEditor?.name)
        setSupported(preference.supported)
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : '无法读取默认编辑器。',
          )
        }
      })
    return () => {
      active = false
    }
  }, [])

  const changeEditor = async () => {
    setError('')
    setIsPending(true)
    try {
      const selection = await selectFileEditor()
      if (!selection) return
      const editor = await setDefaultFileEditor(selection.selectionId)
      setEditorName(editor.name)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '无法设置默认编辑器。',
      )
    } finally {
      setIsPending(false)
    }
  }

  const clearEditor = async () => {
    setError('')
    setIsPending(true)
    try {
      await clearDefaultFileEditor()
      setEditorName(undefined)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '无法清除默认编辑器。',
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <section className="border-b border-divider py-6 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-medium text-foreground">
            默认文件编辑器
          </h3>
          <p className="mt-1 text-sm text-muted">
            {supported
              ? (editorName ?? '每次打开文件时选择应用')
              : '当前系统暂不支持本地应用选择器'}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {editorName ? (
            <Button
              isDisabled={isPending}
              type="button"
              variant="outline"
              onPress={() => void clearEditor()}
            >
              每次询问
            </Button>
          ) : null}
          <Button
            isDisabled={isPending || !supported}
            type="button"
            variant="secondary"
            onPress={() => void changeEditor()}
          >
            {isPending ? '选择中…' : editorName ? '更改' : '选择应用'}
          </Button>
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
