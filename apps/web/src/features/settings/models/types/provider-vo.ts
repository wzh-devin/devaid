export type AuthMethodVo = 'api_key' | 'oauth'

export type ProviderAuthStatusVo =
  'unauthorized' | 'authorizing' | 'authorized' | 'expired' | 'error'

export type ProviderConfigStatusVo = 'unconfigured' | 'configured'

export interface ProviderModelInfoVo {
  id: string
  name: string
  thinkingLevels?: ModelThinkingLevel[]
}

export type ModelThinkingLevel =
  'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export interface ProviderInfoVo {
  authStatus: ProviderAuthStatusVo
  authMethods: AuthMethodVo[]
  configStatus: ProviderConfigStatusVo
  configuredAuthMethod?: AuthMethodVo
  displayName: string
  models: ProviderModelInfoVo[]
  providerId: string
  ready: boolean
}

export interface OAuthPromptVo {
  message: string
  options?: Array<{ label: string; value: string }>
  promptId: string
  promptType: 'text' | 'secret' | 'select' | 'manual_code'
}

export interface OAuthSessionStatusVo {
  authorizationUrl?: string
  deviceCode?: { userCode: string; verificationUri: string }
  error?: { code: string; message: string }
  expiresAt: string
  progress?: string
  prompt?: OAuthPromptVo
  sessionId: string
  status:
    | 'awaiting_user'
    | 'awaiting_provider'
    | 'succeeded'
    | 'failed'
    | 'cancelled'
    | 'expired'
}
