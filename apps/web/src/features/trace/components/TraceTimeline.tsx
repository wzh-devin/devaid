import type { PointerEvent as ReactPointerEvent } from 'react'
import { memo, useCallback, useEffect, useRef } from 'react'
import { AGENT_TRACE_LANE_LABELS } from '../constants/agent-trace'
import {
  AgentTraceLane,
  type AgentTraceRange,
  type AgentTraceRecord,
} from '../types/agent-trace'
import { formatTraceDuration } from '../utils/format-trace-duration'
import {
  getTraceTurnStarts,
  normalizeTraceRange,
} from '../utils/trace-timeline'
import { TraceTimelineRecord } from './TraceTimelineRecord'

const TIMELINE_LANES = [
  AgentTraceLane.INPUT,
  AgentTraceLane.MODEL,
  AgentTraceLane.TOOLS,
] as const
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

interface TraceTimelineProps {
  durationMs: number
  range: AgentTraceRange | null
  records: readonly AgentTraceRecord[]
  selectedRecordId: string | null
  onRangeChange: (range: AgentTraceRange | null) => void
  onSelectRecord: (record: AgentTraceRecord) => void
}

export const TraceTimeline = memo(function TraceTimeline({
  durationMs,
  range,
  records,
  selectedRecordId,
  onRangeChange,
  onSelectRecord,
}: TraceTimelineProps) {
  const dragStartRef = useRef<number | null>(null)
  const hoverIndicatorRef = useRef<HTMLSpanElement>(null)
  const selectionIndicatorRef = useRef<HTMLSpanElement>(null)
  const timelineRef = useRef<HTMLElement>(null)

  const updateSelectionIndicator = useCallback(
    (nextRange: AgentTraceRange | null) => {
      const indicator = selectionIndicatorRef.current
      if (!indicator) return

      if (!nextRange) {
        indicator.style.opacity = '0'
        return
      }

      const startMs = Math.min(nextRange.startMs, nextRange.endMs)
      const endMs = Math.max(nextRange.startMs, nextRange.endMs)
      indicator.style.left = `${(startMs / durationMs) * 100}%`
      indicator.style.width = `${((endMs - startMs) / durationMs) * 100}%`
      indicator.style.opacity = '1'
    },
    [durationMs],
  )

  useEffect(() => {
    updateSelectionIndicator(range)
  }, [range, updateSelectionIndicator])

  useEffect(() => {
    if (range === null) return

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const timeline = timelineRef.current
      const target = event.target

      if (timeline && target instanceof Node && !timeline.contains(target)) {
        onRangeChange(null)
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown, true)
    return () =>
      document.removeEventListener(
        'pointerdown',
        handleOutsidePointerDown,
        true,
      )
  }, [onRangeChange, range])

  const resolveTime = (event: ReactPointerEvent<HTMLElement>): number => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = clamp((event.clientX - bounds.left) / bounds.width, 0, 1)
    return ratio * durationMs
  }

  const updateHoverIndicator = (event: ReactPointerEvent<HTMLElement>) => {
    const indicator = hoverIndicatorRef.current
    if (!indicator) return

    indicator.style.left = `${(resolveTime(event) / durationMs) * 100}%`
    indicator.style.opacity = '1'
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return

    const target = event.target
    if (
      target instanceof Element &&
      target.closest('[data-trace-timeline-record]')
    ) {
      dragStartRef.current = null
      onRangeChange(null)
      return
    }

    const startMs = resolveTime(event)
    dragStartRef.current = startMs
    event.currentTarget.setPointerCapture(event.pointerId)
    updateSelectionIndicator({ endMs: startMs, startMs })
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const currentTimeMs = resolveTime(event)
    updateHoverIndicator(event)

    if (dragStartRef.current !== null) {
      updateSelectionIndicator(
        normalizeTraceRange(dragStartRef.current, currentTimeMs, durationMs),
      )
    }
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const startMs = dragStartRef.current
    if (startMs === null) return

    dragStartRef.current = null
    const nextRange = normalizeTraceRange(
      startMs,
      resolveTime(event),
      durationMs,
    )
    updateSelectionIndicator(nextRange)
    onRangeChange(nextRange)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleRecordSelect = (record: AgentTraceRecord) => {
    updateSelectionIndicator(null)
    onRangeChange(null)
    onSelectRecord(record)
  }

  const selectionStart = range ? Math.min(range.startMs, range.endMs) : null
  const selectionEnd = range ? Math.max(range.startMs, range.endMs) : null
  const turnStarts = getTraceTurnStarts(records)
  const timelineLabel =
    selectionStart !== null && selectionEnd !== null
      ? `Agent 时间轴，已选择 ${formatTraceDuration(selectionStart)} 到 ${formatTraceDuration(selectionEnd)}`
      : 'Agent 时间轴，当前显示全部轨迹'

  return (
    <div className="relative grid h-[50px] grid-cols-[40px_minmax(0,1fr)] items-center border-b border-separator bg-background">
      <div className="grid h-9 grid-rows-[repeat(3,8px)] gap-y-1.5 pr-2 text-right text-[10px] leading-2 text-muted">
        {TIMELINE_LANES.map((lane) => (
          <span className="flex items-center justify-end" key={lane}>
            {AGENT_TRACE_LANE_LABELS[lane]}
          </span>
        ))}
      </div>
      <section
        ref={timelineRef}
        aria-label={timelineLabel}
        className="relative grid h-9 touch-none cursor-crosshair grid-rows-[repeat(3,8px)] gap-y-1.5 overflow-x-clip overflow-y-visible"
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerEnter={updateHoverIndicator}
        onPointerLeave={() => {
          if (hoverIndicatorRef.current)
            hoverIndicatorRef.current.style.opacity = '0'
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {TIMELINE_LANES.map((lane) => (
          <div className="relative h-2" key={lane}>
            {records
              .filter((record) => record.lane === lane)
              .map((record) => {
                const isSelected = record.id === selectedRecordId

                return (
                  <TraceTimelineRecord
                    durationMs={durationMs}
                    isSelected={isSelected}
                    key={record.id}
                    record={record}
                    onSelect={handleRecordSelect}
                  />
                )
              })}
          </div>
        ))}
      </section>
      <div className="pointer-events-none absolute inset-y-0 right-0 left-10 z-20">
        {turnStarts.map(({ startMs, turn }) => (
          <span
            aria-hidden
            className="absolute inset-y-0 w-px bg-separator"
            key={turn}
            style={{ left: `${(startMs / durationMs) * 100}%` }}
            title={`Turn ${turn}`}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 left-10 z-30">
        <span
          ref={selectionIndicatorRef}
          aria-hidden
          className="absolute inset-y-0 border-x-[3px] border-accent bg-accent/10 opacity-0"
        />
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 left-10 z-50">
        <span
          ref={hoverIndicatorRef}
          aria-hidden
          className="absolute inset-y-0 w-px bg-accent opacity-0"
        />
      </div>
    </div>
  )
})
