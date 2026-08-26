import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Tooltip } from '@heroui/react'
import {
  AGENT_TRACE_KIND_LABELS,
  AGENT_TRACE_KIND_STYLES,
} from '../constants/agent-trace.ts'
import type { AgentTraceRecord } from '../types/agent-trace.ts'
import { formatTraceDuration } from '../utils/format-trace-duration.ts'

const TRACE_RECORD_TOOLTIP_DELAY_MS = 1_000

interface TraceTimelineRecordProps {
  durationMs: number
  isSelected: boolean
  record: AgentTraceRecord
  onSelect: (record: AgentTraceRecord) => void
}

/** 展示时间轴中的一条可选择轨迹记录。 */
export function TraceTimelineRecord({
  durationMs,
  isSelected,
  record,
  onSelect,
}: TraceTimelineRecordProps) {
  const endMs = record.startMs + record.durationMs
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    onSelect(record)
  }

  return (
    <Tooltip delay={TRACE_RECORD_TOOLTIP_DELAY_MS}>
      <Tooltip.Trigger
        aria-current={isSelected || undefined}
        aria-label={`${record.label}，${formatTraceDuration(record.startMs)} 到 ${formatTraceDuration(endMs)}`}
        className={`group absolute inset-y-0 cursor-[var(--cursor-interactive)] ${isSelected ? 'z-40' : 'hover:z-40'}`}
        data-trace-timeline-record
        role="button"
        style={{
          left: `${(record.startMs / durationMs) * 100}%`,
          width: `${Math.max((record.durationMs / durationMs) * 100, 0.7)}%`,
        }}
        tabIndex={0}
        onClick={() => onSelect(record)}
        onKeyDown={handleKeyDown}
      >
        <span
          aria-hidden
          className={`block size-full rounded-[1px] ${AGENT_TRACE_KIND_STYLES[record.kind].timelineClassName}`}
        />
        <span
          aria-hidden
          className={`pointer-events-none absolute -inset-0.5 rounded-[3px] border border-accent ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        />
      </Tooltip.Trigger>
      <Tooltip.Content
        className="flex flex-col gap-0.5 whitespace-nowrap"
        placement="bottom"
      >
        <span className="font-semibold">
          {AGENT_TRACE_KIND_LABELS[record.kind]}
        </span>
        <span>{record.label}</span>
        <span className="tabular-nums text-muted">
          {formatTraceDuration(record.startMs)} → {formatTraceDuration(endMs)} ·
          总计 {formatTraceDuration(record.durationMs)}
        </span>
      </Tooltip.Content>
    </Tooltip>
  )
}
