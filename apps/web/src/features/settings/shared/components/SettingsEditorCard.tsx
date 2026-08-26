import type { ReactNode } from 'react'
import { Card } from '@heroui/react'

interface SettingsEditorCardProps {
  children: ReactNode
}

/** 为设置页的内联编辑器提供统一容器。 */
export function SettingsEditorCard({ children }: SettingsEditorCardProps) {
  return (
    <Card
      className="rounded-xl !border !border-solid !border-divider bg-background p-4 shadow-none"
      variant="transparent"
    >
      {children}
    </Card>
  )
}
