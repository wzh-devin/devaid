import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addComposerContextItem,
  createComposerContextItem,
  findComposerTrigger,
  getComposerContextUnavailableReason,
  getComposerCapabilityGroups,
  isComposerModeContext,
  removeComposerRange,
} from './composer-capabilities.ts'

const skills = [
  {
    description: '检查改动',
    enabled: true,
    id: 'review',
    name: '代码审查',
    source: '内置',
  },
  {
    description: '已关闭',
    enabled: false,
    id: 'disabled',
    name: '禁用技能',
    source: '内置',
  },
]

const mcpServers = [
  {
    description: '搜索网页',
    enabled: true,
    endpoint: 'https://example.com',
    id: 'search',
    name: '网页搜索',
    scope: 'project',
    status: 'connected',
    transport: 'http',
  },
  {
    description: '尚未连接',
    enabled: true,
    endpoint: 'npx example',
    id: 'offline',
    name: '离线服务',
    scope: 'project',
    status: 'disconnected',
    transport: 'stdio',
  },
]

test('只在输入开头或空白后解析唤醒词', () => {
  assert.deepEqual(findComposerTrigger('请用 @代码', 6), {
    end: 6,
    mode: 'mention',
    query: '代码',
    start: 3,
  })
  assert.deepEqual(findComposerTrigger('/mcp', 4), {
    end: 4,
    mode: 'slash',
    query: 'mcp',
    start: 0,
  })
  assert.equal(findComposerTrigger('dev@example.com', 15), null)
  assert.equal(findComposerTrigger('https://example.com/a', 21), null)
})

test('+ 与 @ 共享相同分组和能力', () => {
  assert.deepEqual(
    getComposerCapabilityGroups('plus', skills, mcpServers),
    getComposerCapabilityGroups('mention', skills, mcpServers),
  )
})

test('/ 只展示启用技能、已连接 MCP 和管理入口', () => {
  const groups = getComposerCapabilityGroups('slash', skills, mcpServers)
  assert.deepEqual(
    groups.map((group) => group.label),
    ['命令', 'Skills', 'MCP', '插件'],
  )
  assert.deepEqual(
    groups.find((group) => group.id === 'skills')?.items.map((item) =>
      item.label,
    ),
    ['代码审查'],
  )
  assert.deepEqual(
    groups.find((group) => group.id === 'mcp')?.items.map((item) =>
      item.label,
    ),
    ['网页搜索', '管理 MCP'],
  )
})

test('斜杠别名可以按规范化引用检索', () => {
  const groups = getComposerCapabilityGroups(
    'slash',
    skills,
    mcpServers,
    'plan',
  )

  assert.deepEqual(
    groups.flatMap((group) => group.items).map((item) => item.contextReference),
    ['/plan'],
  )
})

test('选择能力会移除唤醒词并返回新光标', () => {
  assert.deepEqual(removeComposerRange('请用 @代 处理', 3, 5), {
    caret: 3,
    value: '请用  处理',
  })
})

test('菜单能力会转换为结构化上下文，管理入口不会转换', () => {
  const groups = getComposerCapabilityGroups('slash', skills, mcpServers)
  const plan = groups[0]?.items[0]
  const manageMcp = groups
    .find((group) => group.id === 'mcp')
    ?.items.find((item) => item.settingsTab)

  assert.deepEqual(createComposerContextItem(plan), {
    description: '先整理任务步骤，再开始执行。',
    id: 'command-plan',
    kind: 'command',
    label: '计划模式',
    reference: '/plan',
    sourceId: undefined,
  })
  assert.equal(createComposerContextItem(manageMcp), null)
})

test('命令保持单选，其他上下文按 ID 去重', () => {
  const plan = {
    description: '计划',
    id: 'command-plan',
    kind: 'command',
    label: '计划模式',
    reference: '/plan',
  }
  const review = { ...plan, id: 'command-review', reference: '/review' }
  const skill = {
    description: '审查',
    id: 'skill-review',
    kind: 'skill',
    label: '代码审查',
    reference: '/review-skill',
    sourceId: 'review',
  }

  assert.deepEqual(
    addComposerContextItem(
      addComposerContextItem([plan, skill], review),
      skill,
    ),
    [review, skill],
  )
  assert.deepEqual([review, skill].filter(isComposerModeContext), [review])
})

test('设置变化会返回 Skill 与 MCP 的失效原因', () => {
  const disabledSkill = {
    description: '禁用',
    id: 'skill-disabled',
    kind: 'skill',
    label: '禁用技能',
    reference: '/disabled',
    sourceId: 'disabled',
  }
  const offlineMcp = {
    description: '离线',
    id: 'mcp-offline',
    kind: 'mcp',
    label: '离线服务',
    reference: '/mcp:offline',
    sourceId: 'offline',
  }

  assert.equal(
    getComposerContextUnavailableReason(
      disabledSkill,
      skills,
      mcpServers,
    ),
    '技能已禁用',
  )
  assert.equal(
    getComposerContextUnavailableReason(
      offlineMcp,
      skills,
      mcpServers,
    ),
    'MCP 未连接',
  )
})
