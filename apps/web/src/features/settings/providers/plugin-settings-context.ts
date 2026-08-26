import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { PluginConnector } from '../plugins/plugin-connectors.ts'

export type PluginSettingsTab = 'mcp' | 'plugins' | 'skills'
export type McpTransport = 'http' | 'stdio'
export type McpConnectionStatus = 'connected' | 'disconnected'

export interface AssistantSkill {
  description: string
  enabled: boolean
  id: string
  name: string
  source: string
}

export interface McpServer {
  description: string
  enabled: boolean
  endpoint: string
  id: string
  name: string
  scope: 'project' | 'user'
  status: McpConnectionStatus
  transport: McpTransport
}

interface PluginSettingsContextValue {
  mcpServers: McpServer[]
  openPluginSettings: (tab: PluginSettingsTab) => void
  pluginConnectors: PluginConnector[]
  setMcpServers: Dispatch<SetStateAction<McpServer[]>>
  setPluginConnectors: Dispatch<SetStateAction<PluginConnector[]>>
  setSkills: Dispatch<SetStateAction<AssistantSkill[]>>
  skills: AssistantSkill[]
}

export const PluginSettingsContext =
  createContext<PluginSettingsContextValue | null>(null)

/** 读取当前页面会话中的 Skill、MCP 配置和插件设置入口。 */
export const usePluginSettings = () => {
  const pluginSettings = useContext(PluginSettingsContext)

  if (!pluginSettings) {
    throw new Error('usePluginSettings 必须在 PluginSettingsProvider 内使用。')
  }

  return pluginSettings
}
