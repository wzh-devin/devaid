import assert from 'node:assert/strict'
import test from 'node:test'
import { getTodoProgress, toPlanSteps } from './todo-progress.ts'

test('计划摘要优先显示进行中的步骤', () => {
  assert.deepEqual(
    getTodoProgress([
      { content: '确认方案', status: 'completed' },
      { content: '实现抽屉', status: 'in_progress' },
      { content: '验证交互', status: 'pending' },
    ]),
    { completed: 1, current: 2, description: '实现抽屉', total: 3 },
  )
})

test('没有进行中步骤时显示下一步，全部完成时显示完成计数', () => {
  assert.deepEqual(
    getTodoProgress([
      { content: '确认方案', status: 'completed' },
      { content: '实现抽屉', status: 'pending' },
    ]),
    { completed: 1, current: 2, description: '实现抽屉', total: 2 },
  )
  assert.deepEqual(
    getTodoProgress([
      { content: '确认方案', status: 'completed' },
      { content: '实现抽屉', status: 'completed' },
    ]),
    { completed: 2, current: 2, description: '计划已完成', total: 2 },
  )
})

test('Todo 状态映射为 Agent Plan 状态', () => {
  assert.deepEqual(
    toPlanSteps([
      { content: '确认方案', status: 'completed' },
      { content: '实现弹层', status: 'in_progress' },
      { content: '验证交互', status: 'pending' },
    ]),
    [
      { id: '确认方案', state: 'done', text: '确认方案' },
      { id: '实现弹层', state: 'active', text: '实现弹层' },
      { id: '验证交互', state: 'pending', text: '验证交互' },
    ],
  )
})
