import type { ChatTodoItem } from '../../features/chat/index.ts'
import type { PlanStep } from '../../types/agent-plan.ts'

export interface TodoProgress {
  completed: number
  current: number
  description: string
  total: number
}

/** 生成计划胶囊显示的完成数和当前任务。 */
export const getTodoProgress = (
  todos: readonly ChatTodoItem[],
): TodoProgress => {
  const completed = todos.filter((todo) => todo.status === 'completed').length
  const currentIndex = todos.findIndex((todo) => todo.status === 'in_progress')
  if (currentIndex >= 0) {
    return {
      completed,
      current: currentIndex + 1,
      description: todos[currentIndex].content,
      total: todos.length,
    }
  }

  const pendingIndex = todos.findIndex((todo) => todo.status === 'pending')
  if (pendingIndex >= 0) {
    return {
      completed,
      current: pendingIndex + 1,
      description: todos[pendingIndex].content,
      total: todos.length,
    }
  }

  return {
    completed,
    current: todos.length,
    description: '计划已完成',
    total: todos.length,
  }
}

const planState = {
  completed: 'done',
  in_progress: 'active',
  pending: 'pending',
} as const

/** 将现有 Todo 快照适配为 Scrim UI Agent Plan 步骤。 */
export const toPlanSteps = (
  todos: readonly ChatTodoItem[],
): readonly PlanStep[] =>
  todos.map((todo) => ({
    id: todo.content,
    state: planState[todo.status],
    text: todo.content,
  }))
