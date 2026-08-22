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
        className={`justify-between rounded-full ${triggerClassName ?? ''}`}
      >
        <Select.Value />
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
