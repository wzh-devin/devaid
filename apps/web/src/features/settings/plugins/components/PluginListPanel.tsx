import { useState } from 'react'
import { Input, TextField } from '@heroui/react'
import {
  filterPluginConnectors,
  togglePluginInstallation,
  togglePluginSkill,
  type PluginConnectorId,
  type PluginSkillId,
} from '../data/plugin-connectors.ts'
import { usePluginSettings } from '../../providers/contexts/plugin-settings-context.ts'
import { PluginDetail } from './PluginDetail.tsx'
import { PluginList } from './PluginList.tsx'

interface PluginListPanelProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
}

/** 管理插件搜索、详情选择和模拟安装状态。 */
export function PluginListPanel({
  onSearchQueryChange,
  searchQuery,
}: PluginListPanelProps) {
  const { pluginConnectors, setPluginConnectors } = usePluginSettings()
  const [selectedPluginId, setSelectedPluginId] =
    useState<PluginConnectorId | null>(null)
  const selectedPlugin = pluginConnectors.find(
    (plugin) => plugin.id === selectedPluginId,
  )
  const visiblePlugins = filterPluginConnectors(pluginConnectors, searchQuery)
  const handleToggleInstallation = (connectorId: PluginConnectorId) =>
    setPluginConnectors((currentConnectors) =>
      togglePluginInstallation(currentConnectors, connectorId),
    )
  const handleToggleSkill = (
    connectorId: PluginConnectorId,
    skillId: PluginSkillId,
  ) =>
    setPluginConnectors((currentConnectors) =>
      togglePluginSkill(currentConnectors, connectorId, skillId),
    )

  if (selectedPlugin) {
    return (
      <PluginDetail
        plugin={selectedPlugin}
        onBack={() => setSelectedPluginId(null)}
        onToggleInstallation={handleToggleInstallation}
        onToggleSkill={handleToggleSkill}
      />
    )
  }

  return (
    <section aria-label="插件列表" className="w-full">
      <div className="flex flex-col gap-3">
        <TextField aria-label="搜索插件" value={searchQuery}>
          <Input
            placeholder="搜索插件"
            variant="secondary"
            onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
          />
        </TextField>

        {visiblePlugins.length > 0 ? (
          <PluginList
            plugins={visiblePlugins}
            onSelect={setSelectedPluginId}
            onToggleInstallation={handleToggleInstallation}
          />
        ) : (
          <p className="py-6 text-center text-sm text-muted">没有匹配的插件</p>
        )}
      </div>
    </section>
  )
}
