export interface CompletionMessageDto {
  content: string
  role: 'assistant' | 'user'
}

export interface CompletionStreamRequestDto {
  messages: CompletionMessageDto[]
  modelId: string
  providerId: string
  systemPrompt?: string
}

export type CompletionEventDto =
  | { type: 'start' }
  | { delta: string; type: 'text_delta' }
  | { delta: string; type: 'reasoning_delta' }
  | { input: number; output: number; total: number; type: 'usage' }
  | { stopReason: string; type: 'done' }
  | { code: string; message: string; type: 'error' }
