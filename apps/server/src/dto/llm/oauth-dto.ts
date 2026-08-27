export interface OAuthSessionCreateRequestDto {
  authMode?: string
  providerId: string
}

export interface OAuthPromptDto {
  message: string
  options?: Array<{ label: string; value: string }>
  promptId: string
  promptType: 'text' | 'secret' | 'select' | 'manual_code'
}

export interface OAuthSessionStatusResponseDto {
  authorizationUrl?: string
  deviceCode?: { userCode: string; verificationUri: string }
  error?: { code: string; message: string }
  expiresAt: string
  progress?: string
  prompt?: OAuthPromptDto
  sessionId: string
  status:
    | 'awaiting_user'
    | 'awaiting_provider'
    | 'succeeded'
    | 'failed'
    | 'cancelled'
    | 'expired'
}

export interface OAuthSessionInputRequestDto {
  promptId: string
  value: string
}
