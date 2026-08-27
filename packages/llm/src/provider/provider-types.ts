export type AuthMethod = 'api_key' | 'oauth'

export type ProviderAuthStatus =
  'unauthorized' | 'authorizing' | 'authorized' | 'expired' | 'error'

export type ProviderConfigStatus = 'unconfigured' | 'configured'

export interface ProviderModelInfo {
  id: string
  name: string
}

export interface ProviderInfo {
  authStatus: ProviderAuthStatus
  authMethods: AuthMethod[]
  configStatus: ProviderConfigStatus
  configuredAuthMethod?: AuthMethod
  displayName: string
  models: ProviderModelInfo[]
  providerId: string
  ready: boolean
}

export interface ProviderConfig {
  models: Array<{ id: string; name?: string }>
}
