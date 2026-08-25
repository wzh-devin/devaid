import assert from 'node:assert/strict'
import test from 'node:test'
import { formatTraceDuration } from './utils/format-trace-duration.ts'
import { isTraceRecordInRange } from './utils/is-trace-record-in-range.ts'

test('格式化毫秒和秒级轨迹耗时', () => {
  assert.equal(formatTraceDuration(240), '240 ms')
  assert.equal(formatTraceDuration(1_250), '1.25 s')
})

test('判断轨迹记录与选择范围是否相交', () => {
  assert.equal(isTraceRecordInRange(100, 200, null), true)
  assert.equal(isTraceRecordInRange(100, 200, { startMs: 300, endMs: 400 }), true)
  assert.equal(isTraceRecordInRange(100, 199, { startMs: 300, endMs: 400 }), false)
})
