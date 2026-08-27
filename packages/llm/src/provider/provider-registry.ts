import {
  createModels,
  type CredentialStore,
  type MutableModels,
  type Provider,
} from '@earendil-works/pi-ai'
import { anthropicProvider } from '@earendil-works/pi-ai/providers/anthropic'
import { deepseekProvider } from '@earendil-works/pi-ai/providers/deepseek'
import { googleProvider } from '@earendil-works/pi-ai/providers/google'
import { minimaxCnProvider } from '@earendil-works/pi-ai/providers/minimax-cn'
import { moonshotaiCnProvider } from '@earendil-works/pi-ai/providers/moonshotai-cn'
import { openaiCodexProvider } from '@earendil-works/pi-ai/providers/openai-codex'
import { openaiProvider } from '@earendil-works/pi-ai/providers/openai'
import { openrouterProvider } from '@earendil-works/pi-ai/providers/openrouter'
import { zaiCodingCnProvider } from '@earendil-works/pi-ai/providers/zai-coding-cn'

function apiKeyOnly(provider: Provider): Provider {
  return { ...provider, auth: { apiKey: provider.auth.apiKey } }
}

/** 创建 LLM 包首批已确认 Provider 的 Pi AI Models。 */
export function createProviderModels(
  credentials: CredentialStore,
): MutableModels {
  const models = createModels({ credentials })
  ;[
    deepseekProvider(),
    openaiProvider(),
    openaiCodexProvider(),
    openrouterProvider(),
    minimaxCnProvider(),
    googleProvider(),
    apiKeyOnly(anthropicProvider()),
    moonshotaiCnProvider(),
    zaiCodingCnProvider(),
  ].forEach((provider) => models.setProvider(provider))
  return models
}
