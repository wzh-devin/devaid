import { useState, type FormEvent, type ReactNode } from 'react'
import { CircleFill, Plus } from '@gravity-ui/icons'
import {
  Button,
  Card,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  TextField,
} from '@heroui/react'
import { SelectMenu } from '../../../components/ui/SelectMenu.tsx'
import {
  API_PROTOCOL_OPTIONS,
  type ApiProtocol,
} from '../provider-models.ts'
import {
  ProviderCustomSettings,
  type ProviderConfiguration,
} from './ProviderCustomSettings.tsx'
import { ProviderModelCatalog } from './ProviderModelCatalog.tsx'

interface ModelProvider extends ProviderConfiguration {
  id: string
  name: string
  isConfigured: boolean
}

type ActiveEditor =
  | { type: 'edit'; providerId: string }
  | { type: 'preset' }
  | { type: 'custom' }
  | null

const PRESET_PROVIDERS = [
  { id: 'amazon-bedrock', label: 'amazon-bedrock', name: 'Amazon Bedrock' },
  { id: 'openai', label: 'openai', name: 'OpenAI' },
  { id: 'anthropic', label: 'anthropic', name: 'Anthropic' },
  { id: 'google', label: 'google', name: 'Google Gemini' },
] as const

const INITIAL_PROVIDERS: ModelProvider[] = [
  {
    id: 'deepseek-official',
    name: 'DeepSeek',
    isConfigured: true,
    baseUrl: '',
    models: [],
  },
]

const DEFAULT_API_PROTOCOL: ApiProtocol = 'openai-completions'

const createEmptyConfiguration = (
  apiProtocol?: ApiProtocol,
): ProviderConfiguration => ({
  apiProtocol,
  baseUrl: '',
  models: [],
})

/** 管理当前页面会话中的模型提供方配置。 */
export function ModelsSettingsSection() {
  const [providers, setProviders] =
    useState<ModelProvider[]>(INITIAL_PROVIDERS)
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null)
  const [presetProviderId, setPresetProviderId] = useState<string>(
    PRESET_PROVIDERS[0].id,
  )
  const [providerConfiguration, setProviderConfiguration] =
    useState<ProviderConfiguration>(createEmptyConfiguration)
  const [providerToDelete, setProviderToDelete] =
    useState<ModelProvider | null>(null)

  const editingProvider =
    activeEditor?.type === 'edit'
      ? providers.find(
          (provider) => provider.id === activeEditor.providerId,
        )
      : undefined

  const closeEditor = () => setActiveEditor(null)

  const openEdit = (provider: ModelProvider) => {
    setProviderConfiguration({
      apiProtocol: provider.apiProtocol,
      baseUrl: provider.baseUrl,
      models: provider.models.map((model) => ({ ...model })),
    })
    setActiveEditor({ type: 'edit', providerId: provider.id })
  }

  const openPreset = () => {
    setProviderConfiguration(createEmptyConfiguration())
    setActiveEditor({ type: 'preset' })
  }

  const openCustom = () => {
    setProviderConfiguration(
      createEmptyConfiguration(DEFAULT_API_PROTOCOL),
    )
    setActiveEditor({ type: 'custom' })
  }

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingProvider) return

    const apiKey = String(
      new FormData(event.currentTarget).get('apiKey') ?? '',
    ).trim()

    setProviders((current) =>
      current.map((provider) =>
        provider.id === editingProvider.id
          ? {
              ...provider,
              ...providerConfiguration,
              isConfigured: apiKey ? true : provider.isConfigured,
            }
          : provider,
      ),
    )
    closeEditor()
  }

  const handlePresetSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const preset = PRESET_PROVIDERS.find(
      (provider) => provider.id === presetProviderId,
    )
    if (!preset) return

    setProviders((current) => {
      const existingProvider = current.find(
        (provider) => provider.id === preset.id,
      )

      if (existingProvider) {
        return current.map((provider) =>
          provider.id === preset.id
            ? { ...provider, ...providerConfiguration, isConfigured: true }
            : provider,
        )
      }

      return [
        ...current,
        {
          id: preset.id,
          name: preset.name,
          isConfigured: true,
          ...providerConfiguration,
        },
      ]
    })
    closeEditor()
  }

  const handleCustomSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const id = String(formData.get('providerId') ?? '').trim()
    const name = String(formData.get('displayName') ?? '').trim()
    const baseUrl = providerConfiguration.baseUrl.trim()
    if (
      !id ||
      !name ||
      !baseUrl ||
      !providerConfiguration.apiProtocol ||
      providers.some((provider) => provider.id === id)
    ) {
      return
    }

    setProviders((current) => [
      ...current,
      {
        id,
        name,
        isConfigured: true,
        ...providerConfiguration,
        baseUrl,
      },
    ])
    closeEditor()
  }

  const deleteProvider = () => {
    if (!providerToDelete) return

    setProviders((current) =>
      current.filter((provider) => provider.id !== providerToDelete.id),
    )
    if (
      activeEditor?.type === 'edit' &&
      activeEditor.providerId === providerToDelete.id
    ) {
      closeEditor()
    }
    setProviderToDelete(null)
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h2 className="text-base leading-6 font-medium text-foreground">模型</h2>
      <p className="mt-3 text-sm leading-[22px] text-muted">
        填入各提供方的 API 密钥即可使用其模型。
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {providers.map((provider) => (
          <Card
            key={provider.id}
            className="flex h-[54px] min-h-0 flex-row items-center justify-between gap-4 rounded-xl !border !border-solid !border-foreground/15 bg-surface px-3.5 py-3 shadow-none"
            variant="transparent"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">
                {provider.name}
              </span>
              <CircleFill
                aria-label={
                  provider.isConfigured
                    ? `${provider.name} API 密钥已配置`
                    : `${provider.name} API 密钥未配置`
                }
                className={`size-2 shrink-0 ${provider.isConfigured ? 'text-success' : 'text-danger'}`}
                role="img"
              />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                className="h-7 min-h-0 rounded-full !px-2.5 !text-xs"
                size="sm"
                variant="outline"
                onPress={() => openEdit(provider)}
              >
                编辑
              </Button>
              <Button
                aria-label={`删除 ${provider.name}`}
                className="h-7 min-h-0 rounded-full !px-2.5 !text-xs text-danger"
                size="sm"
                variant="outline"
                onPress={() => setProviderToDelete(provider)}
              >
                删除
              </Button>
            </div>
          </Card>
        ))}

        {activeEditor === null ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Button
              className="h-11 w-full rounded-xl border-dashed text-sm"
              variant="outline"
              onPress={openPreset}
            >
              <Plus className="size-4" />
              添加提供方
            </Button>
            <Button
              className="h-11 w-full rounded-xl border-dashed text-sm"
              variant="outline"
              onPress={openCustom}
            >
              <Plus className="size-4" />
              添加自定义提供方
            </Button>
          </div>
        ) : null}

        {editingProvider ? (
          <EditorCard>
            <Form
              aria-label={`编辑 ${editingProvider.name}`}
              className="flex flex-col gap-5"
              onSubmit={handleEditSubmit}
            >
              <EditorHeading
                description={editingProvider.id}
                isInline
                title={editingProvider.name}
              />
              <TextField name="apiKey" type="password">
                <Label>API 密钥</Label>
                <Input
                  autoComplete="new-password"
                  placeholder={
                    editingProvider.isConfigured
                      ? '已配置——输入新值可替换'
                      : '输入 API 密钥'
                  }
                  variant="secondary"
                />
                <Description>密钥不会在页面中回显。</Description>
              </TextField>
              <ProviderCustomSettings
                key={editingProvider.id}
                providerId={editingProvider.id}
                value={providerConfiguration}
                onChange={setProviderConfiguration}
              />
              <EditorActions onCancel={closeEditor} />
            </Form>
          </EditorCard>
        ) : null}

        {activeEditor?.type === 'preset' ? (
          <EditorCard>
            <Form
              aria-label="添加提供方"
              className="flex flex-col gap-5"
              onSubmit={handlePresetSubmit}
            >
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">
                  提供方
                </span>
                <SelectMenu
                  ariaLabel="提供方"
                  options={PRESET_PROVIDERS}
                  triggerClassName="w-full sm:max-w-60"
                  value={presetProviderId}
                  onChange={(providerId) => {
                    setPresetProviderId(providerId)
                    setProviderConfiguration(createEmptyConfiguration())
                  }}
                />
              </div>
              <TextField name="apiKey" type="password">
                <Label>API 密钥</Label>
                <Input
                  autoComplete="new-password"
                  placeholder="输入 API 密钥，或留空使用环境认证"
                  variant="secondary"
                />
              </TextField>
              <ProviderCustomSettings
                key={presetProviderId}
                providerId={presetProviderId}
                value={providerConfiguration}
                onChange={setProviderConfiguration}
              />
              <EditorActions onCancel={closeEditor} />
            </Form>
          </EditorCard>
        ) : null}

        {activeEditor?.type === 'custom' ? (
          <EditorCard>
            <Form
              aria-label="添加自定义提供方"
              className="flex flex-col gap-5"
              onSubmit={handleCustomSubmit}
            >
              <EditorHeading title="自定义提供方" />
              <TextField
                isRequired
                name="providerId"
                pattern="[a-z][a-z0-9-]*"
                validate={(value) =>
                  providers.some((provider) => provider.id === value.trim())
                    ? 'Provider ID 已存在'
                    : null
                }
              >
                <Label>Provider ID</Label>
                <Input placeholder="acme-gateway" variant="secondary" />
                <Description>
                  以小写字母开头的标识，在请求中唯一标识该提供方，并用于派生凭据名。
                </Description>
                <FieldError />
              </TextField>
              <TextField isRequired name="displayName">
                <Label>显示名称</Label>
                <Input placeholder="显示名称" variant="secondary" />
                <FieldError />
              </TextField>
              <TextField isRequired name="baseUrl" type="url">
                <Label>API 地址</Label>
                <Input
                  placeholder="https://gateway.example/v1"
                  value={providerConfiguration.baseUrl}
                  variant="secondary"
                  onChange={(event) =>
                    setProviderConfiguration({
                      ...providerConfiguration,
                      baseUrl: event.target.value,
                    })
                  }
                />
                <FieldError />
              </TextField>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">
                  API 协议
                </span>
                <SelectMenu
                  ariaLabel="API 协议"
                  options={API_PROTOCOL_OPTIONS}
                  triggerClassName="w-full sm:max-w-60"
                  value={
                    providerConfiguration.apiProtocol ?? DEFAULT_API_PROTOCOL
                  }
                  onChange={(apiProtocol) =>
                    setProviderConfiguration({
                      ...providerConfiguration,
                      apiProtocol: apiProtocol as ApiProtocol,
                    })
                  }
                />
              </div>
              <TextField isRequired name="apiKey" type="password">
                <Label>API 密钥</Label>
                <Input
                  autoComplete="new-password"
                  placeholder="输入 API 密钥"
                  variant="secondary"
                />
                <FieldError />
              </TextField>
              <ProviderModelCatalog
                canLoadAvailableModels={false}
                providerId=""
                value={providerConfiguration.models}
                onChange={(models) =>
                  setProviderConfiguration({
                    ...providerConfiguration,
                    models,
                  })
                }
              />
              <EditorActions submitLabel="创建提供方" onCancel={closeEditor} />
            </Form>
          </EditorCard>
        ) : null}
      </div>

      {providerToDelete ? (
        <ProviderDeleteDialog
          provider={providerToDelete}
          onClose={() => setProviderToDelete(null)}
          onConfirm={deleteProvider}
        />
      ) : null}
    </section>
  )
}

function EditorCard({ children }: { children: ReactNode }) {
  return (
    <Card
      className="rounded-xl !border !border-solid !border-divider bg-background px-4 py-3.5 shadow-none"
      variant="transparent"
    >
      {children}
    </Card>
  )
}

interface EditorHeadingProps {
  className?: string
  description?: string
  isInline?: boolean
  title: string
}

function EditorHeading({
  className,
  description,
  isInline,
  title,
}: EditorHeadingProps) {
  return (
    <div
      className={`${isInline ? 'flex items-baseline gap-2' : ''} ${className ?? ''}`}
    >
      <h3 className="text-sm leading-[22px] font-medium text-foreground">
        {title}
      </h3>
      {description ? (
        <p
          className={`${isInline ? '' : 'mt-1'} text-xs leading-[18px] text-muted`}
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}

interface EditorActionsProps {
  className?: string
  onCancel: () => void
  submitLabel?: string
}

function EditorActions({
  className,
  onCancel,
  submitLabel = '保存',
}: EditorActionsProps) {
  return (
    <div className={`flex justify-end gap-2 ${className ?? ''}`}>
      <Button
        className="h-9 min-h-0 rounded-full px-3.5 text-sm"
        type="button"
        variant="outline"
        onPress={onCancel}
      >
        取消
      </Button>
      <Button
        className="h-9 min-h-0 rounded-full bg-foreground px-3.5 text-sm text-background hover:bg-foreground/90"
        type="submit"
      >
        {submitLabel}
      </Button>
    </div>
  )
}

interface ProviderDeleteDialogProps {
  provider: ModelProvider
  onClose: () => void
  onConfirm: () => void
}

function ProviderDeleteDialog({
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
            删除“{provider.name}”后，其 API 地址、协议和模型目录将从本次页面会话中移除。
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
