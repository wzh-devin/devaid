import assert from 'node:assert/strict'
import test from 'node:test'
import { formatTraceDuration } from '../utils/format-trace-duration.ts'
import { isTraceRecordInRange } from '../utils/is-trace-record-in-range.ts'
import {
  getTraceTurnStarts,
  normalizeTraceRange,
} from '../utils/trace-timeline.ts'

test('格式化毫秒和秒级轨迹耗时', () => {
  assert.equal(formatTraceDuration(240), '240 ms')
  assert.equal(formatTraceDuration(1_250), '1.25 s')
})

test('判断轨迹记录与选择范围是否相交', () => {
  assert.equal(isTraceRecordInRange(100, 200, null), true)
  assert.equal(
    isTraceRecordInRange(100, 200, { startMs: 300, endMs: 400 }),
    true,
  )
  assert.equal(
    isTraceRecordInRange(100, 199, { startMs: 300, endMs: 400 }),
    false,
  )
})

test('时间轴短选区扩展到最小范围并限制在会话内', () => {
  assert.deepEqual(normalizeTraceRange(20, 40, 1_000), {
    startMs: 0,
    endMs: 240,
  })
  assert.deepEqual(normalizeTraceRange(980, 990, 1_000), {
    startMs: 760,
    endMs: 1_000,
  })
})

test('时间轴按每轮最早记录生成轮次起点', () => {
  assert.deepEqual(
    getTraceTurnStarts([
      { turn: 2, startMs: 320 },
      { turn: 1, startMs: 120 },
      { turn: 2, startMs: 280 },
      { turn: 0, startMs: 0 },
    ]),
    [
      { turn: 1, startMs: 120 },
      { turn: 2, startMs: 280 },
    ],
  )
})
