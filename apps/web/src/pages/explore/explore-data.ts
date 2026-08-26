export interface ExplorePrompt {
  description: string
  id: string
  title: string
}

export interface ExploreCategory {
  id: string
  prompts: readonly ExplorePrompt[]
  subtitle: string
  title: string
}

export const EXPLORE_CATEGORIES: readonly ExploreCategory[] = [
  {
    id: 'work',
    prompts: [
      {
        description: '将零散更新整理成一份可直接发给团队的周报。',
        id: 'explore-work-1',
        title: '撰写团队周报',
      },
      {
        description: '将问题、方案和范围整理成一页产品简报。',
        id: 'explore-work-2',
        title: '一页产品简报',
      },
      {
        description: '为新功能上线起草一份可直接发布的更新说明。',
        id: 'explore-work-3',
        title: '功能发布说明',
      },
    ],
    subtitle: '进展说明、需求文档和规划助手。',
    title: '工作',
  },
  {
    id: 'writing',
    prompts: [
      {
        description: '面向审慎的管理者，润色一段粗略文字。',
        id: 'explore-writing-1',
        title: '面向管理者重写',
      },
      {
        description: '将会议记录整理成包含决策与负责人的精炼摘要。',
        id: 'explore-writing-2',
        title: '会议记录转摘要',
      },
      {
        description: '用具体、突出收益的表达，为产品团队优化营销文案。',
        id: 'explore-writing-3',
        title: '优化营销文案',
      },
    ],
    subtitle: '表达更清晰、更高效、更具体。',
    title: '写作与编辑',
  },
  {
    id: 'planning',
    prompts: [
      {
        description: '将产品简报转化为按周安排、明确负责人的上线清单。',
        id: 'explore-planning-1',
        title: '从简报生成上线清单',
      },
      {
        description: '为产品团队新成员制定里程碑清晰的 30/60/90 天计划。',
        id: 'explore-planning-2',
        title: '新成员 30/60/90 天计划',
      },
      {
        description: '起草一份兼顾路线图与指标的季度规划议程。',
        id: 'explore-planning-3',
        title: '季度规划议程',
      },
    ],
    subtitle: '可直接使用的结构化计划与议程。',
    title: '规划与运营',
  },
] as const
