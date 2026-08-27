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

export interface ProviderConfigUpdate {
  models: Array<{ id: string; name?: string }>
}

export interface ApiKeyCredentialRequest {
  apiKey: string
}

export interface OAuthSessionCreateRequest {
  authMode?: string
  providerId: string
}

export interface OAuthPrompt {
  message: string
  options?: Array<{ label: string; value: string }>
  promptId: string
  promptType: 'text' | 'secret' | 'select' | 'manual_code'
}

export interface OAuthSessionStatusResponse {
  authorizationUrl?: string
  deviceCode?: { userCode: string; verificationUri: string }
  error?: { code: string; message: string }
  expiresAt: string
  progress?: string
  prompt?: OAuthPrompt
  sessionId: string
  status:
    | 'awaiting_user'
    | 'awaiting_provider'
    | 'succeeded'
    | 'failed'
    | 'cancelled'
    | 'expired'
}

export type OAuthSessionCreateResponse = OAuthSessionStatusResponse

export interface OAuthSessionInputRequest {
  promptId: string
  value: string
}

export interface CompletionMessage {
  content: string
  role: 'assistant' | 'user'
}

export interface CompletionStreamRequest {
  messages: CompletionMessage[]
  modelId: string
  providerId: string
  systemPrompt?: string
}

export type CompletionEvent =
  | { type: 'start' }
  | { delta: string; type: 'text_delta' }
  | { delta: string; type: 'reasoning_delta' }
  | { input: number; output: number; total: number; type: 'usage' }
  | { stopReason: string; type: 'done' }
  | { code: string; message: string; type: 'error' }
