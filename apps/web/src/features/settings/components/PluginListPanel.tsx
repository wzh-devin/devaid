import { useState } from 'react'
import {
  ArrowLeft,
  BranchesRight,
  Circle,
  Code,
  Envelope,
  EnvelopeOpen,
  LogoGithub,
  Magnifier,
  PencilToSquare,
  Play,
} from '@gravity-ui/icons'
import { Button, Input, Switch, TextField } from '@heroui/react'
import {
  filterPluginConnectors,
  togglePluginInstallation,
  togglePluginSkill,
  type PluginConnector,
  type PluginConnectorId,
  type PluginSkillId,
} from '../plugin-connectors.ts'
import { usePluginSettings } from '../plugin-settings-context.tsx'
import { SettingsItemCard } from './SettingsItemCard.tsx'

const PLUGIN_ICON_MAP = {
  github: LogoGithub,
  gmail: Envelope,
} satisfies Record<PluginConnectorId, typeof Code>

const SKILL_ICON_MAP = {
  'github-actions-diagnostics': Play,
  'github-issue-management': Circle,
  'github-pull-request-review': BranchesRight,
  'github-repository-search': Magnifier,
  'gmail-draft-compose': PencilToSquare,
  'gmail-message-read': EnvelopeOpen,
  'gmail-message-search': Magnifier,
} satisfies Record<PluginSkillId, typeof Code>

function PluginInstallButton({
  onPress,
  plugin,
}: {
  onPress: () => void
  plugin: PluginConnector
}) {
  return (
    <Button
      aria-label={`${plugin.isInstalled ? '卸载' : '安装'} ${plugin.name}`}
      className={`group h-7 min-h-0 min-w-16 rounded-full !px-3 !text-xs ${
        plugin.isInstalled
          ? '[--button-bg:var(--success-soft)] [--button-bg-hover:var(--danger-soft-hover)] [--button-bg-pressed:var(--danger-soft-hover)] [--button-fg:var(--success-soft-foreground)] hover:[--button-fg:var(--danger-soft-foreground)] focus-visible:[--button-bg:var(--danger-soft)] focus-visible:[--button-fg:var(--danger-soft-foreground)]'
          : ''
      }`}
      size="sm"
      variant={plugin.isInstalled ? 'tertiary' : 'outline'}
      onPress={onPress}
    >
      {plugin.isInstalled ? (
        <>
          <span className="group-hover:hidden group-focus-visible:hidden">
            已安装
          </span>
          <span className="hidden group-hover:inline group-focus-visible:inline">
            卸载
          </span>
        </>
      ) : (
        '安装'
      )}
    </Button>
  )
}

function PluginList({
  onSelect,
  onToggleInstallation,
  plugins,
}: {
  onSelect: (id: PluginConnectorId) => void
  onToggleInstallation: (id: PluginConnectorId) => void
  plugins: readonly PluginConnector[]
}) {
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

function PluginDetail({
  onBack,
  onToggleInstallation,
  onToggleSkill,
  plugin,
}: {
  onBack: () => void
  onToggleInstallation: (id: PluginConnectorId) => void
  onToggleSkill: (connectorId: PluginConnectorId, skillId: PluginSkillId) => void
  plugin: PluginConnector
}) {
  const Icon = PLUGIN_ICON_MAP[plugin.id]

  return (
    <section aria-label={`${plugin.name} 插件详情`} className="w-full">
      <Button className="-ml-2" size="sm" variant="ghost" onPress={onBack}>
        <ArrowLeft aria-hidden className="size-4" />
        返回插件列表
      </Button>

      <div className="mt-5 flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-default">
          <Icon aria-hidden className="size-6 text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-medium text-foreground">
              {plugin.name}
            </h3>
            <PluginInstallButton
              plugin={plugin}
              onPress={() => onToggleInstallation(plugin.id)}
            />
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            {plugin.description}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-foreground">包含的技能</h4>
          <span className="text-sm tabular-nums text-muted">
            {plugin.skills.length}
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {plugin.skills.map((skill) => {
            const SkillIcon = SKILL_ICON_MAP[skill.id]

            return (
              <SettingsItemCard
                key={skill.id}
                actions={
                  <Switch
                    aria-label={`${skill.name} 可用状态`}
                    isDisabled={!plugin.isInstalled}
                    isSelected={plugin.isInstalled && skill.isEnabled}
                    size="sm"
                    onChange={() => onToggleSkill(plugin.id, skill.id)}
                  >
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                }
                description={skill.description}
                icon={
                  <SkillIcon aria-hidden className="size-4 text-muted" />
                }
                title={<span className="truncate">{skill.name}</span>}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}

interface PluginListPanelProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
}

/** 管理 GitHub 与 Gmail 的搜索、模拟安装和技能状态。 */
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
  const visiblePlugins = filterPluginConnectors(
    pluginConnectors,
    searchQuery,
  )
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
            onChange={(event) =>
              onSearchQueryChange(event.currentTarget.value)
            }
          />
        </TextField>

        {visiblePlugins.length > 0 ? (
          <PluginList
            plugins={visiblePlugins}
            onSelect={setSelectedPluginId}
            onToggleInstallation={handleToggleInstallation}
          />
        ) : (
          <p className="py-6 text-center text-sm text-muted">
            没有匹配的插件
          </p>
        )}
      </div>
    </section>
  )
}
