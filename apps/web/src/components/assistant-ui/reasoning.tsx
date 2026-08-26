import { useScrollLock } from '@assistant-ui/react'
import { cva, type VariantProps } from 'class-variance-authority'
import { BrainIcon, ChevronDownIcon } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { cn } from '../../lib/utils.ts'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible.tsx'

const ANIMATION_DURATION = 200
const ReasoningPreviewContext = createContext(false)

const reasoningVariants = cva('aui-reasoning-root mb-4 w-full', {
  variants: {
    variant: {
      outline: 'rounded-lg border px-3 py-2',
      ghost: '',
      muted: 'rounded-lg bg-muted/50 px-3 py-2',
    },
  },
  defaultVariants: { variant: 'outline' },
})

export type ReasoningRootProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  'open' | 'onOpenChange'
> &
  VariantProps<typeof reasoningVariants> & {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    defaultOpen?: boolean
    streaming?: boolean
  }

function ReasoningRoot({
  className,
  variant,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  streaming,
  children,
  ...props
}: ReasoningRootProps) {
  const collapsibleRef = useRef<HTMLDivElement>(null)
  const [initialOpen] = useState(defaultOpen)
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled
    ? controlledOpen
    : (userOpen ?? (streaming || initialOpen))
  const isPreview = streaming === true && isOpen
  const prevStreamingRef = useRef(streaming)

  useLayoutEffect(() => {
    if (prevStreamingRef.current === streaming) return
    prevStreamingRef.current = streaming
    if (!isControlled && userOpen === null && !initialOpen) {
      lockScroll()
    }
  }, [streaming, isControlled, userOpen, initialOpen, lockScroll])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      lockScroll()
      if (!isControlled) setUserOpen(open)
      controlledOnOpenChange?.(open)
    },
    [lockScroll, isControlled, controlledOnOpenChange],
  )

  return (
    <Collapsible
      ref={collapsibleRef}
      data-slot="reasoning-root"
      data-variant={variant}
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn(
        'group/reasoning-root',
        reasoningVariants({ variant, className }),
      )}
      style={
        {
          '--animation-duration': `${ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
      {...props}
    >
      <ReasoningPreviewContext.Provider value={isPreview}>
        {children}
      </ReasoningPreviewContext.Provider>
    </Collapsible>
  )
}

function ReasoningFade({
  side = 'bottom',
  className,
  ...props
}: React.ComponentProps<'div'> & { side?: 'top' | 'bottom' }) {
  return (
    <div
      data-slot="reasoning-fade"
      className={cn(
        'pointer-events-none absolute inset-x-0 z-10 h-8',
        side === 'top'
          ? 'top-0 bg-[linear-gradient(to_bottom,var(--color-background),transparent)]'
          : 'bottom-0 bg-[linear-gradient(to_top,var(--color-background),transparent)]',
        className,
      )}
      {...props}
    />
  )
}

function ReasoningTrigger({
  active,
  duration,
  className,
  ...props
}: Omit<React.ComponentProps<typeof CollapsibleTrigger>, 'className'> & {
  active?: boolean
  className?: string
  duration?: number
}) {
  const durationText = duration ? ` (${duration}s)` : ''

  return (
    <CollapsibleTrigger
      data-slot="reasoning-trigger"
      className={cn(
        'group/trigger flex max-w-[75%] origin-left items-center gap-2 py-1.5 text-sm text-muted transition-[color,scale] hover:text-foreground active:scale-[0.98]',
        className,
      )}
      {...props}
    >
      <BrainIcon
        data-slot="reasoning-trigger-icon"
        className="size-4 shrink-0"
      />
      <span
        data-slot="reasoning-trigger-label"
        className={cn(
          'inline-block leading-none tabular-nums',
          active && 'shimmer motion-reduce:animate-none',
        )}
      >
        Reasoning{durationText}
      </span>
      <ChevronDownIcon
        data-slot="reasoning-trigger-chevron"
        className="mt-0.5 size-4 shrink-0 -rotate-90 transition-transform duration-(--animation-duration) group-data-open/trigger:rotate-0 group-data-panel-open/trigger:rotate-0 motion-reduce:transition-none"
      />
    </CollapsibleTrigger>
  )
}

function ReasoningContent({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof CollapsibleContent>, 'className'> & {
  className?: string
}) {
  const isPreview = useContext(ReasoningPreviewContext)

  return (
    <CollapsibleContent
      data-slot="reasoning-content"
      className={cn(
        'group/collapsible-content relative overflow-hidden text-sm text-muted outline-none',
        'data-closed:pointer-events-none data-closed:animate-collapsible-up data-open:animate-collapsible-down motion-reduce:animate-none',
        className,
      )}
      {...props}
    >
      <ReasoningFade side="top" />
      {children}
      {isPreview ? <ReasoningFade /> : null}
    </CollapsibleContent>
  )
}

function ReasoningText({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  const isPreview = useContext(ReasoningPreviewContext)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isPreview) return
    const scrollElement = scrollRef.current
    const contentElement = contentRef.current
    if (!scrollElement || !contentElement) return

    let pinned = true
    const pin = () => {
      if (pinned) scrollElement.scrollTop = scrollElement.scrollHeight
    }
    const onScroll = () => {
      pinned =
        Math.abs(
          scrollElement.scrollHeight -
            scrollElement.scrollTop -
            scrollElement.clientHeight,
        ) <= 1
    }

    pin()
    scrollElement.addEventListener('scroll', onScroll)
    const observer = new ResizeObserver(pin)
    observer.observe(contentElement)
    return () => {
      scrollElement.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [isPreview])

  return (
    <div
      ref={scrollRef}
      data-slot="reasoning-text"
      className={cn(
        'relative z-0 max-h-64 overflow-y-auto ps-6 pt-2 pb-2 leading-relaxed text-pretty',
        className,
      )}
      {...props}
    >
      <div ref={contentRef} className="space-y-4">
        {children}
      </div>
    </div>
  )
}

export {
  ReasoningContent,
  ReasoningFade,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
}
