export type PluginConnectorId = 'github' | 'gmail'
export type PluginSkillId =
  | 'github-actions-diagnostics'
  | 'github-issue-management'
  | 'github-pull-request-review'
  | 'github-repository-search'
  | 'gmail-draft-compose'
  | 'gmail-message-read'
  | 'gmail-message-search'

export interface PluginSkill {
  description: string
  id: PluginSkillId
  isEnabled: boolean
  name: string
}

export interface PluginConnector {
  description: string
  id: PluginConnectorId
  isInstalled: boolean
  name: string
  skills: PluginSkill[]
}

export const INITIAL_PLUGIN_CONNECTORS: readonly PluginConnector[] = [
  {
    description:
      '连接代码仓库、Issue、Pull Request 和 Actions，为 Agent 补充完整的项目协作上下文。',
    id: 'github',
    isInstalled: true,
    name: 'GitHub',
    skills: [
      {
        description: '搜索仓库中的代码、提交记录与文件内容。',
        id: 'github-repository-search',
        isEnabled: true,
        name: '仓库检索',
      },
      {
        description: '读取变更、评论和检查结果，辅助完成代码审查。',
        id: 'github-pull-request-review',
        isEnabled: true,
        name: 'Pull Request 审查',
      },
      {
        description: '查询并整理 Issue、标签和关联上下文。',
        id: 'github-issue-management',
        isEnabled: false,
        name: 'Issue 管理',
      },
      {
        description: '读取工作流运行状态和日志，定位自动化任务问题。',
        id: 'github-actions-diagnostics',
        isEnabled: true,
        name: 'Actions 诊断',
      },
    ],
  },
  {
    description: '搜索、阅读和撰写 Gmail 邮件，为 Agent 补充沟通上下文。',
    id: 'gmail',
    isInstalled: false,
    name: 'Gmail',
    skills: [
      {
        description: '按主题、发件人和正文内容查找邮件。',
        id: 'gmail-message-search',
        isEnabled: true,
        name: '邮件检索',
      },
      {
        description: '读取邮件正文、会话和附件信息。',
        id: 'gmail-message-read',
        isEnabled: true,
        name: '邮件阅读',
      },
      {
        description: '根据任务上下文创建和编辑邮件草稿。',
        id: 'gmail-draft-compose',
        isEnabled: false,
        name: '草稿撰写',
      },
    ],
  },
]

/** 按名称和说明筛选当前页面会话中的插件列表。 */
export const filterPluginConnectors = (
  pluginConnectors: readonly PluginConnector[],
  searchQuery: string,
) => {
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase()
  if (!normalizedSearchQuery) return pluginConnectors

  return pluginConnectors.filter((plugin) =>
    `${plugin.name} ${plugin.description}`
      .toLocaleLowerCase()
      .includes(normalizedSearchQuery),
  )
}

/** 切换指定插件在当前页面会话中的模拟安装状态。 */
export const togglePluginInstallation = (
  pluginConnectors: readonly PluginConnector[],
  connectorId: PluginConnectorId,
) =>
  pluginConnectors.map((connector) =>
    connector.id === connectorId
      ? { ...connector, isInstalled: !connector.isInstalled }
      : connector,
  )

/** 切换指定插件技能在当前页面会话中的启用状态。 */
export const togglePluginSkill = (
  pluginConnectors: readonly PluginConnector[],
  connectorId: PluginConnectorId,
  skillId: PluginSkillId,
) =>
  pluginConnectors.map((connector) =>
    connector.id === connectorId
      ? {
          ...connector,
          skills: connector.skills.map((skill) =>
            skill.id === skillId
              ? { ...skill, isEnabled: !skill.isEnabled }
              : skill,
          ),
        }
      : connector,
  )
