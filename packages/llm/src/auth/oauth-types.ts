export interface OAuthPrompt {
  message: string
  options?: Array<{ label: string; value: string }>
  promptId: string
  promptType: 'text' | 'secret' | 'select' | 'manual_code'
}

export interface OAuthSessionStatus {
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
