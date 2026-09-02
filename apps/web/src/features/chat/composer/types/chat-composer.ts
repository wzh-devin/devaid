import type {
  ModelThinkingLevel,
  PermissionId,
} from '../../../settings/index.ts'
import type { ComposerContextItem } from '../capabilities/composer-capabilities.ts'

export interface ChatSubmitPayload {
  attachments: readonly File[]
  contextItems: readonly ComposerContextItem[]
  message: string
  modelId: string
  permission: PermissionId
  providerId: string
  thinkingLevel: ModelThinkingLevel
  workspaceId: string
}
