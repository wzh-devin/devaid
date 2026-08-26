import { useState, type ReactNode } from 'react'
import { createInitialModelProviders } from '../../models/data/provider-models.ts'
import { INITIAL_PLUGIN_CONNECTORS } from '../../plugins/data/plugin-connectors.ts'
import { ModelSettingsContext } from '../contexts/model-settings-context.ts'
import {
  PermissionSettingsContext,
  type PermissionId,
} from '../contexts/permission-settings-context.ts'
import {
  PluginSettingsContext,
  type PluginSettingsTab,
} from '../contexts/plugin-settings-context.ts'
import {
  INITIAL_ASSISTANT_SKILLS,
  INITIAL_MCP_SERVERS,
} from '../data/settings-data.ts'

interface SettingsProviderProps {
  children: ReactNode
  onOpenPluginSettings: (tab: PluginSettingsTab) => void
}

/** 持有当前页面会话的模型、权限、技能、MCP 与插件设置状态。 */
export function SettingsProvider({
  children,
  onOpenPluginSettings,
}: SettingsProviderProps) {
  const [providers, setProviders] = useState(createInitialModelProviders)
  const [permission, setPermission] = useState<PermissionId>('workspace-write')
  const [skills, setSkills] = useState(() => [...INITIAL_ASSISTANT_SKILLS])
  const [mcpServers, setMcpServers] = useState(() => [...INITIAL_MCP_SERVERS])
  const [pluginConnectors, setPluginConnectors] = useState(() =>
    INITIAL_PLUGIN_CONNECTORS.map((connector) => ({
      ...connector,
      skills: connector.skills.map((skill) => ({ ...skill })),
    })),
  )

  return (
    <PermissionSettingsContext.Provider value={{ permission, setPermission }}>
      <ModelSettingsContext.Provider value={{ providers, setProviders }}>
        <PluginSettingsContext.Provider
          value={{
            mcpServers,
            openPluginSettings: onOpenPluginSettings,
            pluginConnectors,
            setMcpServers,
            setPluginConnectors,
            setSkills,
            skills,
          }}
        >
          {children}
        </PluginSettingsContext.Provider>
      </ModelSettingsContext.Provider>
    </PermissionSettingsContext.Provider>
  )
}
