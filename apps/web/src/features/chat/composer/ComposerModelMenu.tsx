import { ChevronDown } from '@gravity-ui/icons'
import { Dropdown } from '@heroui/react'
import type { SelectableModelGroup } from '../../settings/index.ts'

interface ComposerModelMenuProps {
  groups: readonly SelectableModelGroup[]
  isDisabled: boolean
  selectedKey: string
  selectedName?: string
  onChange: (key: string) => void
}

/** 选择当前消息使用的模型。 */
export function ComposerModelMenu({
  groups,
  isDisabled,
  selectedKey,
  selectedName,
  onChange,
}: ComposerModelMenuProps) {
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label="模型"
        className="flex h-8 max-w-[calc(100vw-8.5rem)] items-center gap-1 rounded-lg bg-transparent px-2 !text-sm text-muted hover:bg-surface-secondary hover:text-foreground sm:max-w-80 sm:px-3"
        isDisabled={isDisabled}
      >
        <span className="truncate" title={selectedName}>
          {selectedName ?? '暂无可用模型'}
        </span>
        <ChevronDown className="size-3 shrink-0" />
      </Dropdown.Trigger>
      <Dropdown.Popover
        className="w-[7.5rem] min-w-[7.5rem]"
        placement="top end"
      >
        <Dropdown.Menu
          aria-label="模型提供方"
          renderEmptyState={() => (
            <p className="px-3 py-2 text-sm text-muted">请先在设置中添加模型</p>
          )}
        >
          {groups.map((group) => (
            <Dropdown.SubmenuTrigger key={group.id}>
              <Dropdown.Item
                className="whitespace-nowrap"
                id={group.id}
                textValue={group.name}
              >
                <span className="min-w-0 flex-1 truncate">{group.name}</span>
                <Dropdown.SubmenuIndicator />
              </Dropdown.Item>
              <Dropdown.Popover className="w-48 min-w-48">
                <Dropdown.Menu
                  aria-label={`${group.name} 模型`}
                  selectedKeys={[selectedKey]}
                  selectionMode="single"
                  onAction={(key) => onChange(String(key))}
                >
                  {group.models.map((model) => (
                    <Dropdown.Item
                      key={model.key}
                      className="whitespace-nowrap"
                      id={model.key}
                      textValue={model.name}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {model.name}
                      </span>
                      <Dropdown.ItemIndicator />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.SubmenuTrigger>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
