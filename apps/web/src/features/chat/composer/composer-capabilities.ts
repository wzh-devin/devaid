import type {
  AssistantSkill,
  McpServer,
  PluginSettingsTab,
} from '../../settings/index.ts'

export type ComposerMenuMode = 'mention' | 'plus' | 'slash'
export type ComposerContextKind = 'command' | 'mcp' | 'plugin' | 'skill'

export interface ComposerContextItem {
  description: string
  id: string
  kind: ComposerContextKind
  label: string
  reference: string
  sourceId?: string
}

/** 命令会影响 Agent 的交互方式，作为可跨发送保留的模式。 */
export const isComposerModeContext = (item: ComposerContextItem) =>
  item.kind === 'command'

export interface ComposerTrigger {
  end: number
  mode: Exclude<ComposerMenuMode, 'plus'>
  query: string
  start: number
}

export type ComposerCapability = {
  contextReference?: string
  description: string
  id: string
  kind: 'attachment' | 'command' | 'mcp' | 'plugin' | 'skill'
  label: string
  settingsTab?: PluginSettingsTab
  sourceId?: string
}

export interface ComposerCapabilityGroup {
  id: string
  items: ComposerCapability[]
  label: string
}

const COMMANDS: readonly ComposerCapability[] = [
  {
    description: '先整理任务步骤，再开始执行。',
    id: 'command-plan',
    contextReference: '/plan',
    kind: 'command',
    label: '计划模式',
  },
  {
    description: '检查当前工作区改动与潜在风险。',
    id: 'command-review',
    contextReference: '/review',
    kind: 'command',
    label: '代码审查',
  },
]

const ADD_ITEMS: readonly ComposerCapability[] = [
  {
    description: '从设备中选择一个或多个文件。',
    id: 'attachment-files',
    kind: 'attachment',
    label: '文件和文件夹',
  },
]

const PLUGINS: readonly ComposerCapability[] = [
  {
    description: '探索、评审并实现产品界面。',
    id: 'plugin-product-design',
    contextReference: '@Product Design',
    kind: 'plugin',
    label: 'Product Design',
  },
  {
    description: '查询 Codex 与 OpenAI 产品文档。',
    id: 'plugin-openai-docs',
    contextReference: '@OpenAI Docs',
    kind: 'plugin',
    label: 'OpenAI Docs',
  },
  {
    description: '打开设置，管理已添加的技能。',
    id: 'settings-skills',
    kind: 'plugin',
    label: '管理插件',
    settingsTab: 'plugins',
  },
]

const matchesQuery = (item: ComposerCapability, query: string) => {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return true

  return `${item.label} ${item.description} ${item.contextReference ?? ''}`
    .toLocaleLowerCase()
    .includes(normalizedQuery)
}

const filterGroups = (groups: ComposerCapabilityGroup[], query: string) =>
  groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => matchesQuery(item, query)),
    }))
    .filter((group) => group.items.length > 0)

/** 解析光标前有效的 @ 或 / 唤醒词。 */
export function findComposerTrigger(
  value: string,
  caret: number,
): ComposerTrigger | null {
  const safeCaret = Math.max(0, Math.min(caret, value.length))
  const match = value.slice(0, safeCaret).match(/(?:^|\s)([@/])([^\s@/]*)$/u)

  if (!match) return null

  const symbol = match[1]
  const query = match[2]
  if (!symbol || query == null) return null

  return {
    end: safeCaret,
    mode: symbol === '@' ? 'mention' : 'slash',
    query,
    start: safeCaret - query.length - 1,
  }
}

/** 将设置状态映射成 +、@、/ 共用的能力菜单。 */
export function getComposerCapabilityGroups(
  mode: ComposerMenuMode,
  skills: readonly AssistantSkill[],
  mcpServers: readonly McpServer[],
  query = '',
): ComposerCapabilityGroup[] {
  if (mode !== 'slash') {
    return filterGroups(
      [
        { id: 'commands', items: [...COMMANDS], label: '命令' },
        { id: 'add', items: [...ADD_ITEMS], label: '添加' },
        { id: 'plugins', items: [...PLUGINS], label: '插件' },
      ],
      query,
    )
  }

  const skillItems: ComposerCapability[] = skills
    .filter((skill) => skill.enabled)
    .map((skill) => ({
      description: skill.description,
      id: `skill-${skill.id}`,
      contextReference: `/${skill.id}`,
      kind: 'skill',
      label: skill.name,
      sourceId: skill.id,
    }))
  const mcpItems: ComposerCapability[] = mcpServers
    .filter((server) => server.enabled && server.status === 'connected')
    .map((server) => ({
      description: server.description,
      id: `mcp-${server.id}`,
      contextReference: `/mcp:${server.id}`,
      kind: 'mcp',
      label: server.name,
      sourceId: server.id,
    }))

  mcpItems.push({
    description: '打开设置，添加或管理 MCP 服务器。',
    id: 'settings-mcp',
    kind: 'mcp',
    label: '管理 MCP',
    settingsTab: 'mcp',
  })

  return filterGroups(
    [
      { id: 'commands', items: [...COMMANDS], label: '命令' },
      { id: 'skills', items: skillItems, label: 'Skills' },
      { id: 'mcp', items: mcpItems, label: 'MCP' },
      { id: 'plugins', items: [...PLUGINS], label: '插件' },
    ],
    query,
  )
}

/** 从正文中移除已解析的唤醒词，并返回新的光标位置。 */
export function removeComposerRange(value: string, start: number, end: number) {
  return {
    caret: start,
    value: `${value.slice(0, start)}${value.slice(end)}`,
  }
}

/** 将菜单能力转换为可渲染、可提交的结构化上下文。 */
export function createComposerContextItem(
  capability: ComposerCapability,
): ComposerContextItem | null {
  if (
    capability.kind === 'attachment' ||
    capability.settingsTab ||
    !capability.contextReference
  ) {
    return null
  }

  return {
    description: capability.description,
    id: capability.id,
    kind: capability.kind,
    label: capability.label,
    reference: capability.contextReference,
    sourceId: capability.sourceId,
  }
}

/** 按“命令单选、其他类型多选去重”规则合并上下文。 */
export function addComposerContextItem(
  currentItems: readonly ComposerContextItem[],
  nextItem: ComposerContextItem,
): ComposerContextItem[] {
  if (nextItem.kind === 'command') {
    return [nextItem, ...currentItems.filter((item) => item.kind !== 'command')]
  }

  return currentItems.some((item) => item.id === nextItem.id)
    ? [...currentItems]
    : [...currentItems, nextItem]
}

/** 返回设置变化后上下文不可用的原因，可用时返回 null。 */
export function getComposerContextUnavailableReason(
  item: ComposerContextItem,
  skills: readonly AssistantSkill[],
  mcpServers: readonly McpServer[],
) {
  if (item.kind === 'skill') {
    const skill = skills.find((candidate) => candidate.id === item.sourceId)
    if (!skill) return '技能已移除'
    if (!skill.enabled) return '技能已禁用'
  }

  if (item.kind === 'mcp') {
    const server = mcpServers.find(
      (candidate) => candidate.id === item.sourceId,
    )
    if (!server) return 'MCP 已移除'
    if (server.status !== 'connected') return 'MCP 未连接'
    if (!server.enabled) return 'MCP 已禁用'
  }

  return null
}
