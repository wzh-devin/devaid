import { EmptyState } from '@agile-avocation/ui-pro/empty-state'
import { Magnifier } from '@gravity-ui/icons'
import { memo, useEffect, useMemo, useRef } from 'react'
import type { AgentTraceRange, AgentTraceRecord } from '../types/agent-trace'
import { TraceEventRow } from './TraceEventRow'

interface TraceEventListItem {
  isTurnStart: boolean
  record: AgentTraceRecord
}

function toTraceEventListItems(
  records: readonly AgentTraceRecord[],
): TraceEventListItem[] {
  return records.map((record, index) => {
    const previous = records[index - 1]
    const hasTurn = record.turn > 0

    return {
      isTurnStart: hasTurn && record.turn !== previous?.turn,
      record,
    }
  })
}

export interface TraceEventListProps {
  range: AgentTraceRange | null
  records: readonly AgentTraceRecord[]
  selectedRecordId: string | null
  onSelect: (record: AgentTraceRecord) => void
}

export const TraceEventList = memo(function TraceEventList({
  range,
  records,
  selectedRecordId,
  onSelect,
}: TraceEventListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const items = useMemo(() => toTraceEventListItems(records), [records])
  const selectedIndex = useMemo(
    () => items.findIndex((item) => item.record.id === selectedRecordId),
    [items, selectedRecordId],
  )
  const selectedTurn =
    selectedIndex >= 0 ? (items[selectedIndex]?.record.turn ?? null) : null

  useEffect(() => {
    if (selectedIndex < 0) return

    const selectedRow = parentRef.current?.querySelector<HTMLElement>(
      '[data-current=true]',
    )
    selectedRow?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (records.length === 0) {
    return (
      <div className="grid h-full place-items-center bg-background">
        <EmptyState size="sm">
          <EmptyState.Header>
            <EmptyState.Media variant="icon">
              <Magnifier className="size-5" />
            </EmptyState.Media>
            <EmptyState.Title>未找到轨迹记录</EmptyState.Title>
            <EmptyState.Description>尝试调整搜索关键词</EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      </div>
    )
  }

  return (
    <div
      className="h-full min-h-0 overflow-x-hidden overflow-y-auto bg-background pb-12"
      ref={parentRef}
    >
      <ul aria-label="轨迹事件" className="m-0 w-full list-none p-0">
        {items.map((item) => {
          const { record, isTurnStart } = item

          return (
            <li key={record.id}>
              <TraceEventRow
                isTurnSelected={record.turn === selectedTurn}
                isTurnStart={isTurnStart}
                range={range}
                record={record}
                selectedRecordId={selectedRecordId}
                onSelect={onSelect}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
})
