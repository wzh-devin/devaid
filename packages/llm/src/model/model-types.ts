export interface CompletionMessage {
  content: string
  role: 'assistant' | 'user'
}

export interface CompletionRequest {
  messages: CompletionMessage[]
  modelId: string
  providerId: string
  systemPrompt?: string
}
