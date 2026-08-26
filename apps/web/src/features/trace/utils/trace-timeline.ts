import type { AgentTraceRange, AgentTraceRecord } from '../types/agent-trace.ts'

const MINIMUM_RANGE_MS = 240

interface TraceTurnStart {
  startMs: number
  turn: number
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum)

export function normalizeTraceRange(
  startMs: number,
  endMs: number,
  durationMs: number,
): AgentTraceRange {
  const rangeStart = Math.min(startMs, endMs)
  const rangeEnd = Math.max(startMs, endMs)

  if (rangeEnd - rangeStart >= MINIMUM_RANGE_MS) {
    return { endMs: rangeEnd, startMs: rangeStart }
  }

  const center = (rangeStart + rangeEnd) / 2
  const expandedStart = clamp(center - MINIMUM_RANGE_MS / 2, 0, durationMs)
  const expandedEnd = clamp(expandedStart + MINIMUM_RANGE_MS, 0, durationMs)

  return {
    endMs: expandedEnd,
    startMs: Math.max(0, expandedEnd - MINIMUM_RANGE_MS),
  }
}

export function getTraceTurnStarts(
  records: readonly AgentTraceRecord[],
): TraceTurnStart[] {
  const startMsByTurn = new Map<number, number>()

  for (const record of records) {
    if (record.turn <= 0) continue

    const currentStartMs = startMsByTurn.get(record.turn)
    if (currentStartMs === undefined || record.startMs < currentStartMs) {
      startMsByTurn.set(record.turn, record.startMs)
    }
  }

  return Array.from(startMsByTurn, ([turn, startMs]) => ({
    startMs,
    turn,
  })).sort((left, right) => left.startMs - right.startMs)
}
