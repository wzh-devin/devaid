import { useRef } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { useSidebar } from '@agile-avocation/ui-pro/sidebar'
import {
  clampSidebarWidth,
  getMaxSidebarWidth,
  MIN_SIDEBAR_WIDTH,
} from '../utils/sidebar-width.ts'

const KEYBOARD_STEP = 16

interface SidebarResizeHandleProps {
  onChange: (width: number) => void
  onResizingChange: (resizing: boolean) => void
  value: number
}

/** 使用原生 Pointer Events 调整桌面侧栏宽度。 */
export function SidebarResizeHandle({
  onChange,
  onResizingChange,
  value,
}: SidebarResizeHandleProps) {
  const { isMobile, isOpen } = useSidebar()
  const drag = useRef<{ clientX: number; width: number } | undefined>(undefined)
  const maximum = getMaxSidebarWidth(window.innerWidth)

  if (isMobile || !isOpen) return null

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return
    }
    event.preventDefault()
    if (event.key === 'Home') {
      onChange(MIN_SIDEBAR_WIDTH)
      return
    }
    if (event.key === 'End') {
      onChange(maximum)
      return
    }
    onChange(
      clampSidebarWidth(
        value + (event.key === 'ArrowRight' ? KEYBOARD_STEP : -KEYBOARD_STEP),
        window.innerWidth,
      ),
    )
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { clientX: event.clientX, width: value }
    event.currentTarget.setPointerCapture(event.pointerId)
    onResizingChange(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    onChange(
      clampSidebarWidth(
        drag.current.width + event.clientX - drag.current.clientX,
        window.innerWidth,
      ),
    )
  }

  const stopResizing = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    drag.current = undefined
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    onResizingChange(false)
  }

  return (
    <div
      aria-label="调整侧边栏宽度"
      aria-orientation="vertical"
      aria-valuemax={Math.round(maximum)}
      aria-valuemin={MIN_SIDEBAR_WIDTH}
      aria-valuenow={Math.round(value)}
      className="group absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize touch-none select-none outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-transparent hover:after:bg-accent focus-visible:after:bg-accent"
      role="separator"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerCancel={stopResizing}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopResizing}
    />
  )
}
