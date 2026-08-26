import assert from 'node:assert/strict'
import {
  API_PROTOCOL_OPTIONS,
  createInitialModelProviders,
  getBuiltInModels,
  getSelectableModelGroups,
  mergeProviderModels,
  resolveModelSelectionKey,
} from '../data/provider-models.ts'

assert.deepEqual(
  API_PROTOCOL_OPTIONS.map(({ id }) => id),
  ['openai-completions', 'openai-responses', 'anthropic-messages'],
)

const builtIn = getBuiltInModels('deepseek-official')
assert.equal(builtIn.length, 2)

assert.deepEqual(
  mergeProviderModels([{ id: 'deepseek-chat', name: '自定义名称' }], builtIn),
  [
    { id: 'deepseek-chat', name: '自定义名称' },
    { id: 'deepseek-v4-flash', name: 'deepseek-v4-flash' },
    { id: 'deepseek-v4-pro', name: 'deepseek-v4-pro' },
  ],
)

assert.deepEqual(mergeProviderModels([], [builtIn[0], builtIn[0]]), [
  builtIn[0],
])

assert.deepEqual(getBuiltInModels('unknown-provider'), [])

const selectableGroups = getSelectableModelGroups(createInitialModelProviders())
assert.deepEqual(
  selectableGroups.map(({ name, models }) => ({
    name,
    models: models.map((model) => model.name),
  })),
  [
    {
      name: 'DeepSeek',
      models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    },
    {
      name: 'OpenAI',
      models: ['gpt-5.6 sol', 'gpt-5.5', 'GPT-5.4', 'GPT-5 mini'],
    },
  ],
)
assert.equal(
  resolveModelSelectionKey(selectableGroups, '', 'gpt-5.4'),
  'openai:gpt-5.4',
)
assert.equal(
  resolveModelSelectionKey(selectableGroups, 'missing', 'missing'),
  'deepseek-official:deepseek-v4-flash',
)
assert.equal(
  resolveModelSelectionKey(selectableGroups, 'missing', 'gpt-5.4'),
  'deepseek-official:deepseek-v4-flash',
)
assert.equal(resolveModelSelectionKey([], 'missing', 'gpt-5.4'), '')

console.log('provider model checks passed')
