import type { ComponentProps } from 'react'
import type { Collapsible } from '../../components/ui/collapsible.tsx'

export type ReasoningRootProps = Omit<
  ComponentProps<typeof Collapsible>,
  'open' | 'onOpenChange'
> & {
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  open?: boolean
  streaming?: boolean
  variant?: 'ghost' | 'muted' | 'outline' | null
}
