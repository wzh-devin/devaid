import {
  ChevronDown,
  Shield,
  ShieldCheck,
  ShieldExclamation,
} from '@gravity-ui/icons'
import { Dropdown } from '@heroui/react'
import {
  PERMISSION_OPTIONS,
  type PermissionId,
  usePermissionSettings,
} from '../../settings/index.ts'

const PERMISSION_ICONS = {
  'danger-full-access': ShieldExclamation,
  'read-only': ShieldCheck,
  'workspace-write': Shield,
} as const

interface ComposerPermissionMenuProps {
  isDisabled: boolean
}

/** 选择新消息使用的工作区权限。 */
export function ComposerPermissionMenu({
  isDisabled,
}: ComposerPermissionMenuProps) {
  const { permission, setPermission } = usePermissionSettings()
  const selectedPermission =
    PERMISSION_OPTIONS.find((option) => option.id === permission) ??
    PERMISSION_OPTIONS[1]
  const PermissionIcon = PERMISSION_ICONS[selectedPermission.id]

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={`权限：${selectedPermission.label}`}
        className="flex h-8 items-center gap-0.5 rounded-lg bg-transparent px-1 !text-sm text-muted hover:bg-surface-secondary hover:text-foreground"
        isDisabled={isDisabled}
      >
        <PermissionIcon className="size-3.5 shrink-0" />
        <span className="hidden whitespace-nowrap sm:inline">
          {selectedPermission.label}
        </span>
        <ChevronDown className="hidden size-3 shrink-0 sm:block" />
      </Dropdown.Trigger>
      <Dropdown.Popover className="w-56 min-w-56" placement="top start">
        <Dropdown.Menu
          aria-label="权限"
          selectedKeys={[permission]}
          selectionMode="single"
          onAction={(key) => setPermission(String(key) as PermissionId)}
        >
          {PERMISSION_OPTIONS.map((option) => {
            const Icon = PERMISSION_ICONS[option.id]

            return (
              <Dropdown.Item
                key={option.id}
                className="whitespace-nowrap"
                id={option.id}
                textValue={option.label}
              >
                <Icon className="size-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1">{option.label}</span>
                <Dropdown.ItemIndicator />
              </Dropdown.Item>
            )
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
