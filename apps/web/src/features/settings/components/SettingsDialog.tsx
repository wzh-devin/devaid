import { useState } from 'react'
import {
  Database,
  Display,
  Gear,
  Moon,
  Puzzle,
  Sun,
} from '@gravity-ui/icons'
import {
  Button,
  Modal,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react'
import { SelectMenu } from '../../../components/ui/SelectMenu.tsx'
import {
  PERMISSION_OPTIONS,
  type PermissionId,
  usePermissionSettings,
} from '../permission-settings-context.tsx'
import type { PluginSettingsTab } from '../plugin-settings-context.tsx'
import { ModelsSettingsSection } from './ModelsSettingsSection.tsx'
import { PluginsSettingsSection } from './PluginsSettingsSection.tsx'

interface SettingsDialogProps {
  initialPluginTab?: PluginSettingsTab
  initialSection?: SettingsSection
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

const SETTINGS_SECTIONS = [
  { id: 'general', label: '通用设置', icon: Gear },
  { id: 'models', label: '模型', icon: Database },
  { id: 'plugins', label: '插件', icon: Puzzle },
] as const

const APPEARANCE_OPTIONS = [
  { id: 'light', label: '浅色', icon: Sun },
  { id: 'dark', label: '深色', icon: Moon },
  { id: 'system', label: '跟随系统', icon: Display },
] as const

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]['id']

/** 展示应用级本地设置；当前选择只保留在页面会话中。 */
export function SettingsDialog({
  initialPluginTab = 'skills',
  initialSection = 'general',
  isOpen,
  onOpenChange,
}: SettingsDialogProps) {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>(initialSection)
  const [pluginTab, setPluginTab] =
    useState<PluginSettingsTab>(initialPluginTab)
  const { permission, setPermission } = usePermissionSettings()
  const [language, setLanguage] = useState('zh-CN')
  const [appearance, setAppearance] = useState('system')

  return (
    <Modal.Backdrop
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal.Container
        className="h-[calc(100dvh-24px)] w-[calc(100vw-24px)] max-w-[800px] p-0 sm:h-[min(800px,calc(100dvh-48px))] sm:w-[calc(100vw-48px)] sm:p-0"
        placement="center"
      >
        <Modal.Dialog className="relative flex h-full w-full max-w-none flex-col gap-0 overflow-hidden rounded-3xl bg-surface p-0 shadow-2xl outline-none">
          <Modal.Header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-[68px] flex-row items-center gap-0 px-5 py-0 sm:px-6">
            <Modal.Heading className="text-base font-medium text-foreground">
              设置
            </Modal.Heading>
            <Modal.CloseTrigger
              aria-label="关闭设置"
              className="pointer-events-auto bg-transparent text-foreground hover:bg-surface-secondary"
            />
          </Modal.Header>

          <Modal.Body className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden !m-0 !w-full p-0 md:grid-cols-[188px_minmax(0,1fr)] md:grid-rows-1">
            <nav
              aria-label="设置分类"
              className="flex gap-1 overflow-x-auto px-3 pt-16 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-col md:overflow-visible md:p-3 md:pt-16"
            >
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon
                const isActive = section.id === activeSection

                return (
                  <Button
                    key={section.id}
                    aria-pressed={isActive}
                    className={`h-10 shrink-0 justify-start gap-2 rounded-xl px-3 text-left text-sm font-normal md:w-full ${isActive ? 'bg-surface-secondary text-foreground' : ''}`}
                    variant="ghost"
                    onPress={() => setActiveSection(section.id)}
                  >
                    <Icon className="size-4 shrink-0" />
                    {section.label}
                  </Button>
                )
              })}
            </nav>

            <div className="min-h-0 overflow-y-auto px-5 pt-4 pb-5 sm:px-6 sm:pb-6 md:pt-[54px]">
              {activeSection === 'general' ? (
                <div className="mx-auto max-w-2xl">
                  <SettingsSelect
                    description="选择新会话默认使用的工作区权限。"
                    label="权限"
                    options={PERMISSION_OPTIONS}
                    value={permission}
                    onChange={(value) =>
                      setPermission(value as PermissionId)
                    }
                  />

                  <SettingsSelect
                    label="语言"
                    options={[{ id: 'zh-CN', label: '中文' }]}
                    value={language}
                    onChange={setLanguage}
                  />

                  <section className="py-6 first:pt-0">
                    <h3 className="text-base font-medium text-foreground">
                      外观
                    </h3>
                    <ToggleButtonGroup
                      isDetached
                      aria-label="外观"
                      className="mt-4 grid w-full grid-cols-3 gap-3"
                      selectedKeys={[appearance]}
                      selectionMode="single"
                      onSelectionChange={(keys) => {
                        const selectedKey = [...keys][0]
                        if (selectedKey) setAppearance(String(selectedKey))
                      }}
                    >
                      {APPEARANCE_OPTIONS.map((option) => {
                        const Icon = option.icon

                        return (
                          <ToggleButton
                            key={option.id}
                            className="min-h-24 w-full flex-col gap-2 rounded-2xl border border-divider px-2 text-sm [--toggle-button-bg-selected:var(--surface-secondary)] [--toggle-button-fg-selected:var(--foreground)] selected:border-foreground/40"
                            id={option.id}
                            variant="ghost"
                          >
                            <Icon className="size-5" />
                            <span>{option.label}</span>
                          </ToggleButton>
                        )
                      })}
                    </ToggleButtonGroup>
                  </section>
                </div>
              ) : null}

              <div hidden={activeSection !== 'models'}>
                <ModelsSettingsSection />
              </div>

              <div hidden={activeSection !== 'plugins'}>
                <PluginsSettingsSection
                  activeTab={pluginTab}
                  onTabChange={setPluginTab}
                />
              </div>
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}

interface SettingsSelectProps {
  description?: string
  label: string
  options: readonly { id: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

function SettingsSelect({
  description,
  label,
  onChange,
  options,
  value,
}: SettingsSelectProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-divider py-6 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-base font-medium text-foreground">{label}</p>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        ) : null}
      </div>
      <SelectMenu
        ariaLabel={label}
        className="w-full shrink-0 sm:w-auto sm:min-w-40"
        options={options}
        triggerClassName="w-full bg-surface-secondary sm:w-auto"
        value={value}
        onChange={onChange}
      />
    </div>
  )
}
