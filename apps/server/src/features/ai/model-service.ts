import type {
  CompletionMessage,
  CompletionStreamRequest,
  ProviderConfigUpdate,
  ProviderInfo,
  ProviderModelInfo,
} from '@devaid/ai-contracts'
import type {
  AssistantMessage,
  Context,
  Models,
  Usage,
} from '@earendil-works/pi-ai'

import type { FileProviderConfigStore } from './provider-config-store.ts'

const emptyUsage: Usage = {
  cacheRead: 0,
  cacheWrite: 0,
  cost: { cacheRead: 0, cacheWrite: 0, input: 0, output: 0, total: 0 },
  input: 0,
  output: 0,
  totalTokens: 0,
}

function toMessage(
  message: CompletionMessage,
  request: CompletionStreamRequest,
  api: string,
) {
  if (message.role === 'user') {
    return {
      content: message.content,
      role: 'user' as const,
      timestamp: Date.now(),
    }
  }
  return {
    api,
    content: [{ text: message.content, type: 'text' as const }],
    model: request.modelId,
    provider: request.providerId,
    role: 'assistant' as const,
    stopReason: 'stop' as const,
    timestamp: Date.now(),
    usage: emptyUsage,
  } satisfies AssistantMessage
}

/** 可在启动 SSE 前映射为稳定 HTTP 错误的模型配置异常。 */
export class ModelServiceError extends Error {
  readonly code: string
  readonly status: 400 | 404 | 409

  constructor(code: string, message: string, status: 400 | 404 | 409) {
    super(message)
    this.code = code
    this.status = status
  }
}

/** 对外提供 Provider 元数据和单次模型流。 */
export class ModelService {
  readonly models: Models
  private readonly configurations: FileProviderConfigStore

  constructor(models: Models, configurations: FileProviderConfigStore) {
    this.models = models
    this.configurations = configurations
  }

  async listProviders(): Promise<ProviderInfo[]> {
    const configurations = await this.configurations.list()
    return Promise.all(
      this.models.getProviders().map(async (provider) => {
        const auth = await this.models
          .checkAuth(provider.id)
          .catch(() => undefined)
        const selectedModels = configurations[provider.id]?.models ?? []
        return {
          authStatus: auth
            ? ('authorized' as const)
            : ('unauthorized' as const),
          authMethods: [
            ...(provider.auth.apiKey ? (['api_key'] as const) : []),
            ...(provider.auth.oauth ? (['oauth'] as const) : []),
          ],
          configStatus: selectedModels.length
            ? ('configured' as const)
            : ('unconfigured' as const),
          configuredAuthMethod: auth?.type,
          displayName: provider.name,
          models: selectedModels,
          providerId: provider.id,
          ready: !!auth && selectedModels.length > 0,
        }
      }),
    )
  }

  async getProviderInfo(providerId: string) {
    return (await this.listProviders()).find(
      (provider) => provider.providerId === providerId,
    )
  }

  /** 从 Pi AI Provider 读取完整模型目录，供未认证的新增流程使用。 */
  getProviderModels(providerId: string): ProviderModelInfo[] | undefined {
    if (!this.models.getProvider(providerId)) return undefined
    return this.models
      .getModels(providerId)
      .map((model) => ({ id: model.id, name: model.id }))
  }

  /** 校验并原子替换用户显式启用的模型列表。 */
  async saveProviderConfig(
    providerId: string,
    configuration: ProviderConfigUpdate,
  ) {
    if (!this.models.getProvider(providerId)) {
      throw new ModelServiceError(
        'PROVIDER_NOT_FOUND',
        'Provider 不存在。',
        404,
      )
    }

    const catalogIds = new Set(
      this.models.getModels(providerId).map((model) => model.id),
    )
    const modelIds = new Set<string>()
    const models = configuration.models.map((model) => {
      const id = model.id.trim()
      if (!id || modelIds.has(id)) {
        throw new ModelServiceError(
          'INVALID_PROVIDER_CONFIG',
          id ? `模型 ID 重复：${id}` : '模型 ID 不能为空。',
          400,
        )
      }
      if (!catalogIds.has(id)) {
        throw new ModelServiceError(
          'MODEL_NOT_FOUND',
          `Pi AI 当前目录中不存在模型：${id}`,
          400,
        )
      }
      modelIds.add(id)
      return { id, name: model.name?.trim() || id }
    })

    await this.configurations.replace(providerId, models)
  }

  async deleteProvider(providerId: string) {
    if (!this.models.getProvider(providerId)) {
      throw new ModelServiceError(
        'PROVIDER_NOT_FOUND',
        'Provider 不存在。',
        404,
      )
    }
    await this.models.logout(providerId)
    await this.configurations.delete(providerId)
  }

  async saveApiKey(providerId: string, apiKey: string) {
    const provider = this.models.getProvider(providerId)
    if (!provider?.auth.apiKey) throw new Error('Provider 不支持 API Key。')
    await this.models.login(providerId, 'api_key', {
      notify() {},
      async prompt() {
        return apiKey
      },
    })
  }

  async deleteCredential(providerId: string) {
    if (!this.models.getProvider(providerId))
      throw new Error('Provider 不存在。')
    await this.models.logout(providerId)
  }

  async stream(request: CompletionStreamRequest, signal: AbortSignal) {
    if (!this.models.getProvider(request.providerId)) {
      throw new ModelServiceError(
        'PROVIDER_NOT_FOUND',
        'Provider 不存在。',
        404,
      )
    }
    const selectedModels = await this.configurations.read(request.providerId)
    if (!selectedModels.some((model) => model.id === request.modelId)) {
      throw new ModelServiceError(
        'MODEL_NOT_ENABLED',
        '模型尚未在该提供方中启用。',
        400,
      )
    }
    const auth = await this.models
      .checkAuth(request.providerId)
      .catch(() => undefined)
    if (!auth) {
      throw new ModelServiceError(
        'PROVIDER_NOT_READY',
        'Provider 尚未授权或凭证已失效。',
        409,
      )
    }
    const model = this.models.getModel(request.providerId, request.modelId)
    if (!model) {
      throw new ModelServiceError('MODEL_NOT_FOUND', '模型不存在。', 404)
    }
    const context: Context = {
      messages: request.messages.map((message) =>
        toMessage(message, request, model.api),
      ),
      systemPrompt: request.systemPrompt,
    }
    return this.models.streamSimple(model, context, {
      signal,
      toolChoice: 'none',
    })
  }
}
