export interface LibraryItem {
  description: string
  id: string
  tags: readonly string[]
  title: string
  updatedAt: string
}

export const LIBRARY_ITEMS: readonly LibraryItem[] = [
  {
    description: '展示 Markdown、思维链、加载状态和消息操作的示例对话。',
    id: 'lib-pro-ai-showcase',
    tags: ['演示', '组件'],
    title: 'Pro AI 组件展示',
    updatedAt: '刚刚',
  },
  {
    description: '适合工作日晚餐的快捷提示词、语气预设和示例。',
    id: 'lib-quick-dinners',
    tags: ['烹饪', '日常'],
    title: '快捷工作日晚餐',
    updatedAt: '昨天',
  },
  {
    description:
      '涵盖目标对齐、Beta 测试、发布物料和效果衡量的软件上线规划框架。',
    id: 'lib-launch-plan',
    tags: ['产品', '市场推广'],
    title: '上线规划框架',
    updatedAt: '3 天前',
  },
  {
    description: '面向产品团队和审慎决策者的首页定位文案方案。',
    id: 'lib-homepage-copy',
    tags: ['营销', '文案'],
    title: '首页定位文案方案',
    updatedAt: '上周',
  },
  {
    description: '将进展、风险和下一步整合成可直接粘贴的周报模板。',
    id: 'lib-weekly-status',
    tags: ['团队', '运营'],
    title: '团队周报模板',
    updatedAt: '上周',
  },
  {
    description: '兼顾成长、阻碍和身心状态的 1:1 议程提示词。',
    id: 'lib-one-on-ones',
    tags: ['管理'],
    title: '管理者 1:1 议程',
    updatedAt: '本月早些时候',
  },
  {
    description: '比较按用量、按席位和混合 SaaS 定价模式的分析框架。',
    id: 'lib-pricing-models',
    tags: ['商业', '定价'],
    title: '定价模式对比',
    updatedAt: '本月早些时候',
  },
] as const
