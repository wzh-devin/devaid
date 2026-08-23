import type { ReactNode } from 'react'
import { ListBox, Select } from '@heroui/react'

interface SelectMenuOption {
  id: string
  label: string
}

interface SelectMenuProps {
  ariaLabel: string
  className?: string
  isDisabled?: boolean
  options: readonly SelectMenuOption[]
  startContent?: ReactNode
  triggerClassName?: string
  value: string
  onChange: (value: string) => void
}

export function SelectMenu({
  ariaLabel,
  className,
  isDisabled,
  onChange,
  options,
  startContent,
  triggerClassName,
  value,
}: SelectMenuProps) {
  return (
    <Select
      aria-label={ariaLabel}
      className={className}
      isDisabled={isDisabled}
      selectedKey={value}
      variant="secondary"
      onSelectionChange={(key) => {
        if (key != null) onChange(String(key))
      }}
    >
      <Select.Trigger
        className={`justify-between rounded-full ${startContent ? 'pr-7' : ''} ${triggerClassName ?? ''}`}
      >
        {startContent ? (
          <span className="flex min-w-0 items-center gap-1.5">
            {startContent}
            <Select.Value />
          </span>
        ) : (
          <Select.Value />
        )}
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="min-w-56">
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              key={option.id}
              className="whitespace-nowrap"
              id={option.id}
              textValue={option.label}
            >
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
