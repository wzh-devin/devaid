import { Plus } from '@gravity-ui/icons'
import { Button } from '@heroui/react'

interface SettingsAddButtonProps {
  label: string
  onPress: () => void
}

/** 展示设置页统一的新增入口。 */
export function SettingsAddButton({ label, onPress }: SettingsAddButtonProps) {
  return (
    <Button
      className="h-11 w-full rounded-xl border-dashed text-sm"
      variant="outline"
      onPress={onPress}
    >
      <Plus className="size-4" />
      {label}
    </Button>
  )
}
