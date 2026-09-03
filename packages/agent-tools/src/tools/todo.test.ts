import assert from 'node:assert/strict'
import test from 'node:test'

import { createTodoWriteTool, parseTodoWriteInput } from './todo.ts'

test('todo_write 校验并持久化规范化的完整快照', async () => {
  let saved: unknown
  const tool = createTodoWriteTool(async (todos) => {
    saved = todos
  })
  const result = await tool.execute(
    'call-todo',
    {
      todos: [
        { content: '  inspect code  ', status: 'completed' },
        { content: 'implement', status: 'in_progress' },
      ],
    },
    undefined,
  )

  assert.deepEqual(saved, [
    { content: 'inspect code', status: 'completed' },
    { content: 'implement', status: 'in_progress' },
  ])
  assert.equal(result.content[0]?.type, 'text')
  assert.match(
    result.content[0]?.type === 'text' ? result.content[0].text : '',
    /1 completed, 1 in progress, 0 pending/u,
  )
})

test('todo_write 拒绝歧义或越界快照', () => {
  assert.throws(
    () =>
      parseTodoWriteInput({
        todos: [
          { content: 'one', status: 'in_progress' },
          { content: 'two', status: 'in_progress' },
        ],
      }),
    /Only one/u,
  )
  assert.throws(
    () =>
      parseTodoWriteInput({
        todos: [
          { content: 'same', status: 'pending' },
          { content: 'same', status: 'completed' },
        ],
      }),
    /unique/u,
  )
  assert.deepEqual(parseTodoWriteInput({ todos: [] }), [])
})
