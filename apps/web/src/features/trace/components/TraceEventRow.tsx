import { Button } from '@heroui/react'
import type { AgentTraceRange, AgentTraceRecord } from '../types/agent-trace.ts'
import { getTraceEventRowText } from '../utils/get-trace-event-row-text.ts'
import { isTraceRecordInRange } from '../utils/is-trace-record-in-range.ts'
import { TraceKindChip } from './TraceKindChip.tsx'

const ROW_CLASS_NAME =
  'h-[30px]! min-h-[30px]! transform-none! items-stretch! justify-start rounded-none! border-b border-separator/70 px-0 py-0 text-left'
const SELECTED_CLASS_NAME =
  '[--button-bg:color-mix(in_oklab,var(--accent)_10%,transparent)] [--button-bg-hover:color-mix(in_oklab,var(--accent)_10%,transparent)] [--button-bg-pressed:color-mix(in_oklab,var(--accent)_12%,transparent)]'

interface TraceEventRowProps {
  isTurnSelected: boolean
  isTurnStart: boolean
  range: AgentTraceRange | null
  record: AgentTraceRecord
  selectedRecordId: string | null
  onSelect: (record: AgentTraceRecord) => void
}

/** 展示一条轨迹事件及其轮次标记。 */
export function TraceEventRow({
  isTurnSelected,
  isTurnStart,
  range,
  record,
  selectedRecordId,
  onSelect,
}: TraceEventRowProps) {
  const isInRange = isTraceRecordInRange(
    record.startMs,
    record.durationMs,
    range,
  )
  const isSelected = record.id === selectedRecordId

  return (
    <Button
      fullWidth
      aria-label={`查看轨迹记录：${record.label}`}
      aria-pressed={isSelected}
      className={`${ROW_CLASS_NAME} ${isSelected ? SELECTED_CLASS_NAME : ''} ${isInRange ? 'opacity-100' : 'opacity-40'}`}
      data-current={isSelected || undefined}
      size="sm"
      variant="ghost"
      onPress={() => onSelect(record)}
    >
      <span className="flex h-full min-w-0 w-full items-stretch">
        <span className="relative w-10 shrink-0 self-stretch">
          {record.turn > 0 && isTurnStart ? (
            <span
              className={`absolute top-0 left-0 z-20 rounded-sm px-1 py-0.5 text-[9px] leading-none font-medium tabular-nums ${
                isTurnSelected
                  ? 'bg-accent/12 text-accent'
                  : 'bg-default text-foreground'
              }`}
            >
              Turn {record.turn}
            </span>
          ) : null}
          {isSelected ? (
            <span className="absolute inset-y-0 left-0 z-10 w-[3px] bg-accent" />
          ) : null}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2 pr-3">
          <span className="flex w-20 shrink-0 justify-end">
            <TraceKindChip kind={record.kind} />
          </span>
          <span
            className={`min-w-0 truncate text-xs ${isSelected ? 'text-foreground' : 'text-muted'}`}
          >
            {getTraceEventRowText(record)}
          </span>
        </span>
      </span>
    </Button>
  )
}
