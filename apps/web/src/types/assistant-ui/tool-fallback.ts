import type { ComponentProps } from 'react'
import type { Collapsible } from '../../components/ui/collapsible.tsx'

export type ToolFallbackRootProps = Omit<
  ComponentProps<typeof Collapsible>,
  'className' | 'open' | 'onOpenChange'
> & {
  className?: string
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  open?: boolean
}
