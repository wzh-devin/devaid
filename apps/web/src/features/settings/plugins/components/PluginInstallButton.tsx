import { Button } from '@heroui/react'
import type { PluginConnector } from '../data/plugin-connectors.ts'

interface PluginInstallButtonProps {
  onPress: () => void
  plugin: PluginConnector
}

/** 切换插件的模拟安装状态。 */
export function PluginInstallButton({
  onPress,
  plugin,
}: PluginInstallButtonProps) {
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
