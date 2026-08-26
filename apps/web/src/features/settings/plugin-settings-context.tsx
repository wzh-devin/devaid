import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { PluginConnector } from './plugin-connectors.ts'

export type PluginSettingsTab = 'mcp' | 'plugins' | 'skills'
export type McpTransport = 'http' | 'stdio'
export type McpConnectionStatus = 'connected' | 'disconnected'

export interface PluginSkill {
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
  setSkills: Dispatch<SetStateAction<PluginSkill[]>>
  skills: PluginSkill[]
}

export const INITIAL_PLUGIN_SKILLS: readonly PluginSkill[] = [
  {
    description: '检查当前工作区改动并报告风险。',
    enabled: true,
    id: 'code-review',
    name: '代码审查',
    source: '内置',
  },
  {
    description: '把复杂任务整理为可执行计划。',
    enabled: true,
    id: 'planning',
    name: '计划模式',
    source: '项目',
  },
] as const

export const INITIAL_MCP_SERVERS: readonly McpServer[] = [
  {
    description: '为当前会话提供网页搜索能力。',
    enabled: true,
    endpoint: 'https://mcp.example.com/search',
    id: 'web-search',
    name: '网页搜索',
    scope: 'project',
    status: 'connected',
    transport: 'http',
  },
] as const

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
