import assert from 'node:assert/strict'
import {
  API_PROTOCOL_OPTIONS,
  getBuiltInModels,
  mergeProviderModels,
} from './provider-models.ts'

assert.deepEqual(
  API_PROTOCOL_OPTIONS.map(({ id }) => id),
  ['openai-completions', 'openai-responses', 'anthropic-messages'],
)

const builtIn = getBuiltInModels('deepseek-official')
assert.equal(builtIn.length, 2)

assert.deepEqual(
  mergeProviderModels(
    [{ id: 'deepseek-chat', name: '自定义名称' }],
    builtIn,
  ),
  [
    { id: 'deepseek-chat', name: '自定义名称' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
  ],
)

assert.deepEqual(
  mergeProviderModels([], [builtIn[0], builtIn[0]]),
  [builtIn[0]],
)

assert.deepEqual(getBuiltInModels('unknown-provider'), [])

console.log('provider model checks passed')
