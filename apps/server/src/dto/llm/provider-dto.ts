export type AuthMethodDto = 'api_key' | 'oauth'

export type ProviderAuthStatusDto =
  'unauthorized' | 'authorizing' | 'authorized' | 'expired' | 'error'

export type ProviderConfigStatusDto = 'unconfigured' | 'configured'

export interface ApiKeyCredentialRequestDto {
  apiKey: string
}

export interface ProviderModelInfoDto {
  id: string
  name: string
  thinkingLevels?: ModelThinkingLevelDto[]
}

export type ModelThinkingLevelDto =
  'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export interface ProviderInfoDto {
  authStatus: ProviderAuthStatusDto
  authMethods: AuthMethodDto[]
  configStatus: ProviderConfigStatusDto
  configuredAuthMethod?: AuthMethodDto
  displayName: string
  models: ProviderModelInfoDto[]
  providerId: string
  ready: boolean
}

export interface ProviderConfigUpdateDto {
  models: Array<{ id: string; name?: string }>
}
