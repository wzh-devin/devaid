import type { PluginConnector, PluginConnectorId } from './plugin-connectors.ts'
import { SettingsItemCard } from '../shared/SettingsItemCard.tsx'
import { PLUGIN_ICON_MAP } from './plugin-icons.ts'
import { PluginInstallButton } from './PluginInstallButton.tsx'

interface PluginListProps {
  onSelect: (id: PluginConnectorId) => void
  onToggleInstallation: (id: PluginConnectorId) => void
  plugins: readonly PluginConnector[]
}

/** 展示可安装的插件列表。 */
export function PluginList({
  onSelect,
  onToggleInstallation,
  plugins,
}: PluginListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {plugins.map((plugin) => {
        const Icon = PLUGIN_ICON_MAP[plugin.id]

        return (
          <li key={plugin.id}>
            <SettingsItemCard
              actions={
                <PluginInstallButton
                  plugin={plugin}
                  onPress={() => onToggleInstallation(plugin.id)}
                />
              }
              description={plugin.description}
              icon={<Icon aria-hidden className="size-4 text-muted" />}
              openLabel={`查看 ${plugin.name} 插件详情`}
              title={<span className="truncate">{plugin.name}</span>}
              onOpen={() => onSelect(plugin.id)}
            />
          </li>
        )
      })}
    </ul>
  )
}
