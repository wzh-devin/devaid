import type {
  ChangeEvent,
  CompositionEvent,
  KeyboardEvent,
  SyntheticEvent,
} from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatStatus } from '@agile-avocation/ui-pro/prompt-input'
import { PromptInput } from '@agile-avocation/ui-pro/prompt-input'
import {
  Bulb,
  ChevronDown,
  FileText,
  Folder,
  Shield,
  ShieldCheck,
  ShieldExclamation,
  Terminal,
  Xmark,
} from '@gravity-ui/icons'
import { Button, Dropdown } from '@heroui/react'
import { SelectMenu } from '../../../components/ui/SelectMenu.tsx'
import { useModelSettings } from '../../settings/model-settings-context.tsx'
import {
  PERMISSION_OPTIONS,
  type PermissionId,
  usePermissionSettings,
} from '../../settings/permission-settings-context.tsx'
import { usePluginSettings } from '../../settings/plugin-settings-context.tsx'
import {
  getSelectableModelGroups,
  resolveModelSelectionKey,
} from '../../settings/provider-models.ts'
import {
  addComposerContextItem,
  createComposerContextItem,
  findComposerTrigger,
  getComposerContextUnavailableReason,
  getComposerCapabilityGroups,
  isComposerModeContext,
  removeComposerRange,
  type ComposerCapability,
  type ComposerContextItem,
  type ComposerMenuMode,
} from '../composer-capabilities.ts'
import { useChatWorkspace } from '../workspace-context.ts'
import { resolveComposerWorkspace } from '../workspace-data.ts'
import { ComposerCapabilityMenu } from './ComposerCapabilityMenu.tsx'
import { ComposerContextBar } from './ComposerContextBar.tsx'

interface PendingAttachment {
  file: File
  id: string
  src?: string
}

interface ComposerMenuState {
  end?: number
  mode: ComposerMenuMode
  query: string
  start?: number
}

export interface ChatSubmitPayload {
  attachments: readonly File[]
  contextItems: readonly ComposerContextItem[]
  message: string
  modelId: string
  permission: PermissionId
  workspaceId: string
}

interface ChatComposerProps {
  className?: string
  fixedWorkspaceId?: string
  initialModelId?: string
  value: string
  onSubmit?: (payload: ChatSubmitPayload) => void
  onValueChange: (value: string) => void
}

const PERMISSION_ICONS = {
  'danger-full-access': ShieldExclamation,
  'read-only': ShieldCheck,
  'workspace-write': Shield,
} as const

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
  fixedWorkspaceId,
  initialModelId = 'gpt-5.4',
  onSubmit,
  onValueChange,
  value,
}: ChatComposerProps) {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [activeCapabilityIndex, setActiveCapabilityIndex] = useState(0)
  const [contextItems, setContextItems] = useState<ComposerContextItem[]>([])
  const [menuState, setMenuState] = useState<ComposerMenuState | null>(null)
  const [modelKey, setModelKey] = useState('')
  const [status, setStatus] = useState<ChatStatus>('ready')
  const { providers } = useModelSettings()
  const { permission, setPermission } = usePermissionSettings()
  const { mcpServers, openPluginSettings, skills } = usePluginSettings()
  const { onWorkspaceSelect, selectedWorkspaceId, workspaces } =
    useChatWorkspace()
  const composerWorkspace = resolveComposerWorkspace(
    selectedWorkspaceId,
    fixedWorkspaceId,
  )
  const attachmentsRef = useRef<PendingAttachment[]>([])
  const composerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isComposingRef = useRef(false)
  const promptInputShellRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<number[]>([])
  const modelGroups = getSelectableModelGroups(providers)
  const selectableModels = modelGroups.flatMap((group) => group.models)
  const selectedModelKey = resolveModelSelectionKey(
    modelGroups,
    modelKey,
    initialModelId,
  )
  const selectedModel = selectableModels.find(
    (model) => model.key === selectedModelKey,
  )
  const selectedPermission =
    PERMISSION_OPTIONS.find((option) => option.id === permission) ??
    PERMISSION_OPTIONS[1]
  const PermissionIcon = PERMISSION_ICONS[selectedPermission.id]
  const capabilityGroups = menuState
    ? getComposerCapabilityGroups(
        menuState.mode,
        skills,
        mcpServers,
        menuState.query,
      )
    : []
  const capabilities = capabilityGroups.flatMap((group) => group.items)
  const activeCapability = capabilities.length
    ? capabilities[activeCapabilityIndex % capabilities.length]
    : undefined
  const contextDisplayItems = contextItems.map((item) => ({
    ...item,
    unavailableReason: getComposerContextUnavailableReason(
      item,
      skills,
      mcpServers,
    ),
  }))
  const hasUnavailableContext = contextDisplayItems.some(
    (item) => item.unavailableReason,
  )
  const activeMode = contextDisplayItems.find(isComposerModeContext)
  const transientContextItems = contextDisplayItems.filter(
    (item) => !isComposerModeContext(item),
  )
  const ActiveModeIcon = activeMode?.id === 'command-plan' ? Bulb : Terminal

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
    if (menuState) return

    const message = value.trim()

    if (
      status !== 'ready' ||
      !selectedModel ||
      hasUnavailableContext ||
      (!message &&
        attachments.length === 0 &&
        transientContextItems.length === 0)
    ) {
      return
    }

    onSubmit?.({
      attachments: attachments.map(({ file }) => file),
      contextItems,
      message,
      modelId: selectedModel.id,
      permission,
      workspaceId: composerWorkspace.workspaceId,
    })

    attachments.forEach(revokeAttachmentUrl)
    setAttachments([])
    setContextItems((currentItems) =>
      currentItems.filter(isComposerModeContext),
    )
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

  const handleRemoveContext = (id: string) => {
    setContextItems((currentItems) =>
      currentItems.filter((item) => item.id !== id),
    )
  }

  const getTextArea = () =>
    composerRef.current?.querySelector<HTMLTextAreaElement>('textarea')

  const updateMenuFromTextArea = (textArea: HTMLTextAreaElement) => {
    if (isComposingRef.current) return

    const trigger = findComposerTrigger(
      textArea.value,
      textArea.selectionStart ?? textArea.value.length,
    )
    setActiveCapabilityIndex(0)
    setMenuState(
      trigger
        ? {
            end: trigger.end,
            mode: trigger.mode,
            query: trigger.query,
            start: trigger.start,
          }
        : null,
    )
  }

  const handleTextAreaEvent = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    updateMenuFromTextArea(event.currentTarget)
  }

  const handleCompositionEnd = (
    event: CompositionEvent<HTMLTextAreaElement>,
  ) => {
    isComposingRef.current = false
    updateMenuFromTextArea(event.currentTarget)
  }

  const handleCapabilitySelect = (capability: ComposerCapability) => {
    setMenuState(null)

    const textArea = getTextArea()
    const start = menuState?.start
    const end = menuState?.end
    const next =
      start == null || end == null
        ? {
            caret: textArea?.selectionStart ?? value.length,
            value,
          }
        : removeComposerRange(value, start, end)

    if (next.value !== value) onValueChange(next.value)

    if (capability.kind === 'attachment') {
      fileInputRef.current?.click()
      return
    }

    if (capability.settingsTab) {
      openPluginSettings(capability.settingsTab)
      return
    }

    const contextItem = createComposerContextItem(capability)
    if (!contextItem) return

    setContextItems((currentItems) =>
      addComposerContextItem(currentItems, contextItem),
    )
    window.requestAnimationFrame(() => {
      const currentTextArea = getTextArea()
      currentTextArea?.focus()
      currentTextArea?.setSelectionRange(next.caret, next.caret)
    })
  }

  const handleComposerKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (!menuState) {
      if (
        event.key === 'Backspace' &&
        value.length === 0 &&
        event.currentTarget.selectionStart === 0 &&
        transientContextItems.length > 0
      ) {
        event.preventDefault()
        setContextItems((currentItems) =>
          currentItems.at(-1)?.kind === 'command'
            ? currentItems
            : currentItems.slice(0, -1),
        )
      }
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setMenuState(null)
      return
    }

    if (capabilities.length === 0) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const offset = event.key === 'ArrowDown' ? 1 : -1
      setActiveCapabilityIndex(
        (current) =>
          (Math.min(current, capabilities.length - 1) +
            offset +
            capabilities.length) %
          capabilities.length,
      )
      return
    }

    if (
      (event.key === 'Enter' && !event.shiftKey) ||
      event.key === 'Tab'
    ) {
      if (!activeCapability) return
      event.preventDefault()
      handleCapabilitySelect(activeCapability)
      return
    }

    if (event.key === ' ') {
      const triggerReference = `${menuState.mode === 'slash' ? '/' : '@'}${menuState.query}`
      const exactCapability = capabilities.find(
        (capability) =>
          capability.contextReference?.toLocaleLowerCase() ===
          triggerReference.toLocaleLowerCase(),
      )
      if (!exactCapability) return

      event.preventDefault()
      handleCapabilitySelect(exactCapability)
    }
  }

  const isGenerating = status === 'submitted' || status === 'streaming'
  const canSend = Boolean(
    selectedModel &&
      !hasUnavailableContext &&
      (value.trim() || attachments.length || transientContextItems.length),
  )

  return (
    <div ref={composerRef} className={className ?? 'w-full'}>
      {composerWorkspace.isSelectable ? (
        <div className="mb-3 flex h-8 items-center px-2">
          <SelectMenu
            ariaLabel="工作区"
            className="max-w-full"
            options={workspaces}
            startContent={<Folder className="size-4 shrink-0" />}
            triggerClassName="h-8 max-w-56 bg-transparent pl-1 text-sm hover:bg-surface-secondary"
            value={composerWorkspace.workspaceId}
            onChange={onWorkspaceSelect}
          />
        </div>
      ) : null}

      <PromptInput
        className="w-full"
        status={status}
        value={value}
        variant="primary"
        onStop={handleStop}
        onSubmit={handleSubmit}
        onValueChange={onValueChange}
      >
        <PromptInput.Shell
          ref={promptInputShellRef}
          className="min-h-[7.5rem]"
        >
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

            {hasUnavailableContext ? (
              <p className="px-4 pt-1 text-xs text-danger" role="status">
                移除或重新启用不可用的上下文后再发送。
              </p>
            ) : null}

            <div
              className={`flex min-w-0 items-start gap-2 px-4 pb-16 ${attachments.length > 0 || hasUnavailableContext ? 'pt-1' : 'pt-4'}`}
            >
              <ComposerContextBar
                className="max-w-[55%] shrink-0 sm:max-w-[60%]"
                isDisabled={isGenerating}
                items={transientContextItems}
                onRemove={handleRemoveContext}
              />
              <PromptInput.TextArea
                aria-label="消息输入"
                className="!m-0 !min-h-7 min-w-24 flex-1 !rounded-none !px-0 !pt-0 !pb-0 !text-base !leading-7"
                placeholder="你想了解什么？"
                onCompositionEnd={handleCompositionEnd}
                onCompositionStart={() => {
                  isComposingRef.current = true
                  setMenuState(null)
                }}
                onInput={handleTextAreaEvent}
                onKeyDown={handleComposerKeyDown}
                onSelect={handleTextAreaEvent}
              />
            </div>
          </PromptInput.Content>

          <PromptInput.Toolbar className="gap-2">
            <PromptInput.ToolbarStart className="min-w-0 !gap-0.5">
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
              <ComposerCapabilityMenu
                activeId={activeCapability?.id}
                anchorRef={promptInputShellRef}
                groups={capabilityGroups}
                isDisabled={isGenerating}
                isOpen={Boolean(menuState)}
                onOpenChange={(open) => {
                  setActiveCapabilityIndex(0)
                  setMenuState(open ? { mode: 'plus', query: '' } : null)
                }}
                onSelect={handleCapabilitySelect}
              />
              <Dropdown>
                <Dropdown.Trigger
                  aria-label={`权限：${selectedPermission.label}`}
                  className="flex h-8 items-center gap-0.5 rounded-lg bg-transparent px-1 !text-sm text-muted hover:bg-surface-secondary hover:text-foreground"
                  isDisabled={isGenerating}
                >
                  <PermissionIcon className="size-3.5 shrink-0" />
                  <span className="hidden whitespace-nowrap sm:inline">
                    {selectedPermission.label}
                  </span>
                  <ChevronDown className="hidden size-3 shrink-0 sm:block" />
                </Dropdown.Trigger>
                <Dropdown.Popover
                  className="w-56 min-w-56"
                  placement="top start"
                >
                  <Dropdown.Menu
                    aria-label="权限"
                    selectedKeys={[permission]}
                    selectionMode="single"
                    onAction={(key) =>
                      setPermission(String(key) as PermissionId)
                    }
                  >
                    {PERMISSION_OPTIONS.map((option) => {
                      const Icon = PERMISSION_ICONS[option.id]

                      return (
                        <Dropdown.Item
                          key={option.id}
                          className="whitespace-nowrap"
                          id={option.id}
                          textValue={option.label}
                        >
                          <Icon className="size-4 shrink-0 text-muted" />
                          <span className="min-w-0 flex-1">
                            {option.label}
                          </span>
                          <Dropdown.ItemIndicator />
                        </Dropdown.Item>
                      )
                    })}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
              {activeMode ? (
                <>
                  <span
                    aria-hidden
                    className="h-4 w-px shrink-0 bg-divider"
                  />
                  <Button
                    aria-label={`关闭${activeMode.label}`}
                    className="h-8 min-w-0 shrink-0 gap-1 rounded-lg bg-transparent px-1 text-sm font-normal text-muted hover:bg-surface-secondary hover:text-foreground"
                    isDisabled={isGenerating}
                    size="sm"
                    variant="ghost"
                    onPress={() => handleRemoveContext(activeMode.id)}
                  >
                    <ActiveModeIcon className="size-3.5 shrink-0" />
                    <span className="max-w-24 truncate">
                      {activeMode.label}
                    </span>
                  </Button>
                </>
              ) : null}
            </PromptInput.ToolbarStart>

            <PromptInput.ToolbarEnd className="gap-1">
              <Dropdown>
                <Dropdown.Trigger
                  aria-label="模型"
                  className="flex h-8 max-w-[calc(100vw-8.5rem)] items-center gap-1 rounded-lg bg-transparent px-2 !text-sm text-muted hover:bg-surface-secondary hover:text-foreground sm:max-w-80 sm:px-3"
                  isDisabled={isGenerating}
                >
                  <span className="truncate" title={selectedModel?.name}>
                    {selectedModel?.name ?? '暂无可用模型'}
                  </span>
                  <ChevronDown className="size-3 shrink-0" />
                </Dropdown.Trigger>
                <Dropdown.Popover
                  className="w-[7.5rem] min-w-[7.5rem]"
                  placement="top end"
                >
                  <Dropdown.Menu
                    aria-label="模型提供方"
                    renderEmptyState={() => (
                      <p className="px-3 py-2 text-sm text-muted">
                        请先在设置中添加模型
                      </p>
                    )}
                  >
                    {modelGroups.map((group) => (
                      <Dropdown.SubmenuTrigger key={group.id}>
                        <Dropdown.Item
                          className="whitespace-nowrap"
                          id={group.id}
                          textValue={group.name}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {group.name}
                          </span>
                          <Dropdown.SubmenuIndicator />
                        </Dropdown.Item>
                        <Dropdown.Popover className="w-48 min-w-48">
                          <Dropdown.Menu
                            aria-label={`${group.name} 模型`}
                            selectedKeys={[selectedModelKey]}
                            selectionMode="single"
                            onAction={(key) => setModelKey(String(key))}
                          >
                            {group.models.map((model) => (
                              <Dropdown.Item
                                key={model.key}
                                className="whitespace-nowrap"
                                id={model.key}
                                textValue={model.name}
                              >
                                <span className="min-w-0 flex-1 truncate">
                                  {model.name}
                                </span>
                                <Dropdown.ItemIndicator />
                              </Dropdown.Item>
                            ))}
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown.SubmenuTrigger>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
              <PromptInput.Send
                aria-label={isGenerating ? '停止生成' : '发送消息'}
                className="size-9 min-h-9 min-w-9"
                isDisabled={!canSend && !isGenerating}
              />
            </PromptInput.ToolbarEnd>
          </PromptInput.Toolbar>
        </PromptInput.Shell>

        <PromptInput.Footer>
          AI 可能会出错，请核对重要信息。
        </PromptInput.Footer>
      </PromptInput>
    </div>
  )
}
