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

const BUILT_IN_MODELS: Record<string, readonly ProviderModelConfig[]> = {
  'deepseek-official': [
    { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
  ],
  openai: [
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
