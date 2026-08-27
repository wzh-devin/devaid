import assert from 'node:assert/strict'
import {
  API_PROTOCOL_OPTIONS,
  createInitialModelProviders,
  getOAuthLoginOptions,
  getSelectableModelGroups,
  mergeProviderModels,
  resolveModelSelectionKey,
  toModelProvider,
} from '../data/provider-models.ts'

const deepseekModels = [
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' },
]
const openaiModels = [
  { id: 'gpt-5.6-sol', name: 'gpt-5.6 sol' },
  { id: 'gpt-5.5', name: 'gpt-5.5' },
  { id: 'gpt-5.4', name: 'GPT-5.4' },
  { id: 'gpt-5-mini', name: 'GPT-5 mini' },
]

assert.deepEqual(
  API_PROTOCOL_OPTIONS.map(({ id }) => id),
  ['openai-completions', 'openai-responses', 'anthropic-messages'],
)

assert.deepEqual(
  mergeProviderModels(
    [{ id: 'deepseek-chat', name: '自定义名称' }],
    deepseekModels,
  ),
  [{ id: 'deepseek-chat', name: '自定义名称' }, ...deepseekModels],
)

assert.deepEqual(
  mergeProviderModels([], [deepseekModels[0], deepseekModels[0]]),
  [deepseekModels[0]],
)

assert.deepEqual(getOAuthLoginOptions('openai-codex'), [
  { id: 'browser', label: '浏览器登录（推荐）' },
  { id: 'device_code', label: '设备码登录' },
])
assert.deepEqual(getOAuthLoginOptions('openrouter'), [])

assert.deepEqual(createInitialModelProviders(), [])

const selectableGroups = getSelectableModelGroups([
  toModelProvider({
    authStatus: 'authorized',
    authMethods: ['api_key'],
    configStatus: 'configured',
    configuredAuthMethod: 'api_key',
    displayName: 'DeepSeek',
    models: deepseekModels,
    providerId: 'deepseek',
    ready: true,
  }),
  toModelProvider({
    authStatus: 'authorized',
    authMethods: ['api_key'],
    configStatus: 'configured',
    configuredAuthMethod: 'api_key',
    displayName: 'OpenAI',
    models: openaiModels,
    providerId: 'openai',
    ready: true,
  }),
])
assert.deepEqual(
  selectableGroups.map(({ name, models }) => ({
    name,
    models: models.map((model) => model.name),
  })),
  [
    {
      name: 'DeepSeek',
      models: ['DeepSeek V4 Flash', 'DeepSeek V4 Pro'],
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
  'deepseek:deepseek-v4-flash',
)
assert.equal(
  resolveModelSelectionKey(selectableGroups, 'missing', 'gpt-5.4'),
  'deepseek:deepseek-v4-flash',
)
assert.equal(resolveModelSelectionKey([], 'missing', 'gpt-5.4'), '')

assert.deepEqual(
  getSelectableModelGroups([
    toModelProvider({
      authStatus: 'authorized',
      authMethods: ['oauth'],
      configStatus: 'unconfigured',
      displayName: 'OpenAI Codex',
      models: [],
      providerId: 'openai-codex',
      ready: false,
    }),
  ]),
  [],
)

console.log('provider model checks passed')
