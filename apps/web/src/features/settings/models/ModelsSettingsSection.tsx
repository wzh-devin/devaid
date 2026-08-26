import { useState, type FormEvent } from 'react'
import { CircleFill } from '@gravity-ui/icons'
import {
  Button,
  Card,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from '@heroui/react'
import { SelectMenu } from '../../../components/ui/index.ts'
import { useModelSettings } from '../providers/model-settings-context.ts'
import {
  API_PROTOCOL_OPTIONS,
  type ApiProtocol,
  type ModelProvider,
  type ProviderConfiguration,
} from './provider-models.ts'
import { ProviderCustomSettings } from './ProviderCustomSettings.tsx'
import { ProviderDeleteDialog } from './ProviderDeleteDialog.tsx'
import { ProviderEditorHeading } from './ProviderEditorHeading.tsx'
import { ProviderModelCatalog } from './ProviderModelCatalog.tsx'
import { SettingsAddButton } from '../shared/SettingsAddButton.tsx'
import { SettingsEditorActions } from '../shared/SettingsEditorActions.tsx'
import { SettingsEditorCard } from '../shared/SettingsEditorCard.tsx'

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
  const { providers, setProviders } = useModelSettings()
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
      ? providers.find((provider) => provider.id === activeEditor.providerId)
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
    setProviderConfiguration(createEmptyConfiguration(DEFAULT_API_PROTOCOL))
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
            <SettingsAddButton label="添加提供方" onPress={openPreset} />
            <SettingsAddButton label="添加自定义提供方" onPress={openCustom} />
          </div>
        ) : null}

        {editingProvider ? (
          <SettingsEditorCard>
            <Form
              aria-label={`编辑 ${editingProvider.name}`}
              className="flex flex-col gap-5"
              onSubmit={handleEditSubmit}
            >
              <ProviderEditorHeading
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
              <SettingsEditorActions onCancel={closeEditor} />
            </Form>
          </SettingsEditorCard>
        ) : null}

        {activeEditor?.type === 'preset' ? (
          <SettingsEditorCard>
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
              <SettingsEditorActions onCancel={closeEditor} />
            </Form>
          </SettingsEditorCard>
        ) : null}

        {activeEditor?.type === 'custom' ? (
          <SettingsEditorCard>
            <Form
              aria-label="添加自定义提供方"
              className="flex flex-col gap-5"
              onSubmit={handleCustomSubmit}
            >
              <ProviderEditorHeading title="自定义提供方" />
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
              <SettingsEditorActions
                submitLabel="创建提供方"
                onCancel={closeEditor}
              />
            </Form>
          </SettingsEditorCard>
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
