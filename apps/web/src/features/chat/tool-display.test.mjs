import assert from 'node:assert/strict'
import test from 'node:test'
import {
  findPendingToolApproval,
  getToolArgsText,
  getToolStatus,
} from './tool-display.ts'

test('适配工具状态和结构化参数', () => {
  assert.deepEqual(
    getToolStatus({
      state: 'output-available',
      toolName: 'get_weather',
    }),
    { type: 'complete' },
  )
  assert.deepEqual(
    getToolStatus({
      errorText: 'Network error',
      state: 'output-error',
      toolName: 'get_weather',
    }),
    { error: 'Network error', reason: 'error', type: 'incomplete' },
  )
  assert.deepEqual(
    getToolStatus({ state: 'input-streaming', toolName: 'get_weather' }),
    { type: 'running' },
  )
  assert.equal(
    getToolArgsText({
      input: { location: 'San Francisco' },
      state: 'input-available',
      toolName: 'get_weather',
    }),
    '{\n  "location": "San Francisco"\n}',
  )
})

test('按消息顺序返回首个未处理的审批工具', () => {
  const messages = [
    {
      id: 'assistant-1',
      role: 'assistant',
      tools: [
        { state: 'requires-action', toolName: 'readFile' },
        { state: 'requires-action', toolName: 'sendEmail' },
      ],
    },
  ]

  assert.equal(findPendingToolApproval(messages, [])?.tool.toolName, 'readFile')
  assert.equal(
    findPendingToolApproval(messages, ['assistant-1:0'])?.tool.toolName,
    'sendEmail',
  )
  assert.equal(
    findPendingToolApproval(messages, ['assistant-1:0', 'assistant-1:1']),
    undefined,
  )
  assert.equal(
    findPendingToolApproval(messages, [], ['readFile'])?.tool.toolName,
    'sendEmail',
  )
})
