import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { ModelProvider } from './provider-models.ts'

interface ModelSettingsContextValue {
  providers: ModelProvider[]
  setProviders: Dispatch<SetStateAction<ModelProvider[]>>
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
