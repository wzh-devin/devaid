import { ArrowLeft } from '@gravity-ui/icons'
import { Button, Switch } from '@heroui/react'
import type {
  PluginConnector,
  PluginConnectorId,
  PluginSkillId,
} from '../data/plugin-connectors.ts'
import { SettingsItemCard } from '../../shared/components/SettingsItemCard.tsx'
import {
  PLUGIN_ICON_MAP,
  PLUGIN_SKILL_ICON_MAP,
} from '../constants/plugin-icons.ts'
import { PluginInstallButton } from './PluginInstallButton.tsx'

interface PluginDetailProps {
  onBack: () => void
  onToggleInstallation: (id: PluginConnectorId) => void
  onToggleSkill: (
    connectorId: PluginConnectorId,
    skillId: PluginSkillId,
  ) => void
  plugin: PluginConnector
}

/** 展示插件说明及其技能开关。 */
export function PluginDetail({
  onBack,
  onToggleInstallation,
  onToggleSkill,
  plugin,
}: PluginDetailProps) {
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
            const SkillIcon = PLUGIN_SKILL_ICON_MAP[skill.id]

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
                icon={<SkillIcon aria-hidden className="size-4 text-muted" />}
                title={<span className="truncate">{skill.name}</span>}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
