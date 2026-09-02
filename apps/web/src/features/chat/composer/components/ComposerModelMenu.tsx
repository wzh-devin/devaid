import { ChevronDown } from '@gravity-ui/icons'
import { Dropdown } from '@heroui/react'
import { Header } from 'react-aria-components'
import type {
  ModelThinkingLevel,
  SelectableModelGroup,
} from '../../../settings/index.ts'

interface ComposerModelMenuProps {
  groups: readonly SelectableModelGroup[]
  isDisabled: boolean
  selectedKey: string
  selectedName?: string
  selectedThinkingLevel: ModelThinkingLevel
  onChange: (key: string) => void
  onThinkingLevelChange: (level: ModelThinkingLevel) => void
}

const THINKING_LEVEL_LABELS: Record<ModelThinkingLevel, string> = {
  off: '关闭',
  minimal: '最低',
  low: '低',
  medium: '中',
  high: '高',
  xhigh: '极高',
  max: '最高',
}

/** 选择当前消息使用的模型与该模型支持的推理强度。 */
export function ComposerModelMenu({
  groups,
  isDisabled,
  selectedKey,
  selectedName,
  selectedThinkingLevel,
  onChange,
  onThinkingLevelChange,
}: ComposerModelMenuProps) {
  const selectedModel = groups
    .flatMap((group) => group.models)
    .find((model) => model.key === selectedKey)
  const thinkingLevels = selectedModel?.thinkingLevels ?? ['off']
  const supportsThinking = thinkingLevels.some((level) => level !== 'off')
  const thinkingLabel = THINKING_LEVEL_LABELS[selectedThinkingLevel]

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={`模型：${selectedName ?? '暂无可用模型'}${supportsThinking ? `，推理强度：${thinkingLabel}` : ''}`}
        className="flex h-8 max-w-[calc(100vw-8.5rem)] items-center gap-1.5 rounded-full bg-surface-secondary px-3 !text-sm text-foreground transition-colors hover:bg-surface-tertiary sm:max-w-80"
        isDisabled={isDisabled}
      >
        <span className="truncate" title={selectedName}>
          {selectedName ?? '暂无可用模型'}
        </span>
        {supportsThinking ? (
          <span className="shrink-0 text-muted">{thinkingLabel}</span>
        ) : null}
        <ChevronDown className="size-3 shrink-0 text-muted" />
      </Dropdown.Trigger>

      <Dropdown.Popover
        className="w-[min(18rem,calc(100vw-1.5rem))]"
        placement="top end"
      >
        <Dropdown.Menu
          aria-label="模型与推理设置"
          renderEmptyState={() => (
            <p className="px-3 py-2 text-sm text-muted">请先在设置中添加模型</p>
          )}
        >
          {groups.length > 0 ? (
            <Dropdown.SubmenuTrigger>
              <Dropdown.Item id="model" textValue="模型">
                <span className="shrink-0">模型</span>
                <span className="ml-auto min-w-0 truncate text-muted">
                  {selectedName}
                </span>
                <Dropdown.SubmenuIndicator />
              </Dropdown.Item>
              <Dropdown.Popover className="w-[min(20rem,calc(100vw-1.5rem))]">
                <Dropdown.Menu
                  aria-label="模型"
                  selectedKeys={[selectedKey]}
                  selectionMode="single"
                  onAction={(key) => onChange(String(key))}
                >
                  {groups.map((group) => (
                    <Dropdown.Section key={group.id} aria-label={group.name}>
                      <Header className="px-2.5 pt-2 pb-1 text-xs font-medium text-muted">
                        {group.name}
                      </Header>
                      {group.models.map((model) => (
                        <Dropdown.Item
                          key={model.key}
                          id={model.key}
                          textValue={model.name}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {model.name}
                          </span>
                          <Dropdown.ItemIndicator />
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Section>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.SubmenuTrigger>
          ) : null}

          {supportsThinking ? (
            <Dropdown.SubmenuTrigger>
              <Dropdown.Item id="thinking-level" textValue="推理强度">
                <span className="shrink-0">推理强度</span>
                <span className="ml-auto text-muted">{thinkingLabel}</span>
                <Dropdown.SubmenuIndicator />
              </Dropdown.Item>
              <Dropdown.Popover className="w-36 min-w-36">
                <Dropdown.Menu
                  aria-label="推理强度"
                  selectedKeys={[selectedThinkingLevel]}
                  selectionMode="single"
                  onAction={(key) =>
                    onThinkingLevelChange(key as ModelThinkingLevel)
                  }
                >
                  {thinkingLevels.map((level) => (
                    <Dropdown.Item
                      key={level}
                      id={level}
                      textValue={THINKING_LEVEL_LABELS[level]}
                    >
                      <span className="flex-1">
                        {THINKING_LEVEL_LABELS[level]}
                      </span>
                      <Dropdown.ItemIndicator />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.SubmenuTrigger>
          ) : null}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
