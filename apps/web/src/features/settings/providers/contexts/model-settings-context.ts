import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { ModelProvider } from '../../models/data/provider-models.ts'
import type { ModelThinkingLevel } from '../../models/types/provider-vo.ts'

interface ModelSettingsContextValue {
  error: string | null
  isLoading: boolean
  providers: ModelProvider[]
  refreshProviders: () => Promise<void>
  setProviders: Dispatch<SetStateAction<ModelProvider[]>>
  setThinkingLevel: Dispatch<SetStateAction<ModelThinkingLevel>>
  thinkingLevel: ModelThinkingLevel
}

export const ModelSettingsContext =
  createContext<ModelSettingsContextValue | null>(null)

/** 读取当前页面会话的模型提供方配置。 */
export const useModelSettings = () => {
  const modelSettings = useContext(ModelSettingsContext)

  if (!modelSettings) {
    throw new Error('useModelSettings 必须在 ModelSettingsProvider 内使用。')
  }

  return modelSettings
}
