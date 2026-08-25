export interface ProviderModelConfig {
  id: string
  name: string
}

export const API_PROTOCOL_OPTIONS = [
  { id: 'openai-completions', label: 'openai-completions' },
  { id: 'openai-responses', label: 'openai-responses' },
  { id: 'anthropic-messages', label: 'anthropic-messages' },
] as const

export type ApiProtocol = (typeof API_PROTOCOL_OPTIONS)[number]['id']

export interface ProviderConfiguration {
  apiProtocol?: ApiProtocol
  baseUrl: string
  models: ProviderModelConfig[]
}

export interface ModelProvider extends ProviderConfiguration {
  id: string
  isConfigured: boolean
  name: string
}

export interface SelectableModel {
  id: string
  key: string
  name: string
}

export interface SelectableModelGroup {
  id: string
  models: SelectableModel[]
  name: string
}

const BUILT_IN_MODELS: Record<string, readonly ProviderModelConfig[]> = {
  'deepseek-official': [
    { id: 'deepseek-v4-flash', name: 'deepseek-v4-flash' },
    { id: 'deepseek-v4-pro', name: 'deepseek-v4-pro' },
  ],
  openai: [
    { id: 'gpt-5.6-sol', name: 'gpt-5.6 sol' },
    { id: 'gpt-5.5', name: 'gpt-5.5' },
    { id: 'gpt-5.4', name: 'GPT-5.4' },
    { id: 'gpt-5-mini', name: 'GPT-5 mini' },
  ],
  anthropic: [
    { id: 'claude-opus-4-6', name: 'Claude 4.6 Opus' },
    { id: 'claude-sonnet-4-6', name: 'Claude 4.6 Sonnet' },
  ],
  google: [
    { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro' },
    { id: 'gemini-3.1-flash', name: 'Gemini 3.1 Flash' },
  ],
  'amazon-bedrock': [
    { id: 'anthropic.claude-opus-4-6-v1', name: 'Claude 4.6 Opus' },
    { id: 'anthropic.claude-sonnet-4-6-v1', name: 'Claude 4.6 Sonnet' },
  ],
}

export function getBuiltInModels(providerId: string): ProviderModelConfig[] {
  return BUILT_IN_MODELS[providerId]?.map((model) => ({ ...model })) ?? []
}

/** 创建供设置页和聊天模型菜单共用的页面会话初始配置。 */
export const createInitialModelProviders = (): ModelProvider[] => [
  {
    id: 'deepseek-official',
    name: 'DeepSeek',
    isConfigured: true,
    baseUrl: '',
    models: getBuiltInModels('deepseek-official'),
  },
  {
    id: 'openai',
    name: 'OpenAI',
    isConfigured: true,
    baseUrl: '',
    models: getBuiltInModels('openai'),
  },
]

/** 将已配置提供方转换成可供二级菜单展示的去重模型分组。 */
export const getSelectableModelGroups = (
  providers: readonly ModelProvider[],
): SelectableModelGroup[] => {
  const knownKeys = new Set<string>()

  return providers.flatMap((provider) => {
    if (!provider.isConfigured) return []

    const models = provider.models.flatMap((model) => {
      const id = model.id.trim()
      const key = `${provider.id}:${id}`
      if (!id || knownKeys.has(key)) return []

      knownKeys.add(key)
      return [{ id, key, name: model.name.trim() || id }]
    })

    return models.length
      ? [{ id: provider.id, models, name: provider.name }]
      : []
  })
}

/** 保留有效选择，否则按初始模型 ID 或首个可用模型回退。 */
export const resolveModelSelectionKey = (
  groups: readonly SelectableModelGroup[],
  currentKey: string,
  initialModelId: string,
) => {
  const models = groups.flatMap((group) => group.models)
  const currentModel = models.find((model) => model.key === currentKey)
  if (currentModel) return currentModel.key

  return currentKey
    ? (models[0]?.key ?? '')
    : (models.find((model) => model.id === initialModelId)?.key ??
        models[0]?.key ??
        '')
}

export function mergeProviderModels(
  current: ProviderModelConfig[],
  incoming: ProviderModelConfig[],
): ProviderModelConfig[] {
  const knownIds = new Set(current.map((model) => model.id))
  const merged = [...current]
  for (const model of incoming) {
    if (knownIds.has(model.id)) continue
    knownIds.add(model.id)
    merged.push(model)
  }
  return merged
}
