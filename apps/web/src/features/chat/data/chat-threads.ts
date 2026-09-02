import { SHOWCASE_THREAD } from './showcase-thread.ts'
import type { ChatThread } from './chat-types.ts'

const DEFAULT_USER = {
  avatar:
    'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg',
  email: 'darnell@email.com',
  name: 'Darnell Howe',
} as const

export const CHAT_THREADS: readonly ChatThread[] = [
  SHOWCASE_THREAD,
  {
    archived: false,
    id: 'quick-recipes-for-dinner',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        text: '我今晚时间不多，有什么快手晚餐建议吗？',
      },
      {
        actions: 'full',
        id: 'msg-2',
        role: 'assistant',
        text: '当然！你是只做自己的一份，还是要做多人份？',
      },
      {
        id: 'msg-3',
        role: 'user',
        text: '只做我自己的。想要简单一点，但别太无聊 😅',
      },
      {
        actions: 'full',
        id: 'msg-4',
        listItems: [
          '蒜香鸡肉炒蔬菜：鸡胸肉、大蒜、酱油和冷冻蔬菜，搭配米饭或薄饼。',
          '升级版蒜香橄榄油意面：意面、橄榄油、大蒜和辣椒碎，有虾仁或蘑菇也可以加进去。',
          '鸡蛋卷饼或欧姆蛋：鸡蛋、奶酪和手边的蔬菜，也可以用薄饼卷起来。',
        ],
        role: 'assistant',
        text: '明白了。这里有几个 15～20 分钟就能完成的选择：',
      },
      {
        id: 'msg-5',
        role: 'user',
        text: '第三种看起来是什么样？我想看看自己会不会喜欢。',
      },
      {
        actions: 'minimal',
        id: 'msg-6',
        image: {
          alt: '配有圣女果和欧芹的欧姆蛋',
          src: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/images/egg.webp',
        },
        role: 'assistant',
        text: '当然！大概是这样：',
      },
    ],
    modelId: 'gpt-5.4',
    preview: '使用简单食材和单锅烹饪的快手晚餐建议。',
    searchModeId: 'deep-search',
    title: '快手晚餐食谱',
    updatedAt: '2 分钟前',
    user: DEFAULT_USER,
  },
  {
    archived: false,
    id: 'launch-plan-for-q3-rollout',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        text: '帮我为分析仪表盘第三季度上线起草一份发布计划。',
      },
      {
        actions: 'full',
        id: 'msg-2',
        role: 'assistant',
        text: '没问题。为了让计划更可执行，我会拆分为内部对齐、Beta 验证、发布物料和上线后效果衡量。',
      },
      {
        actions: 'full',
        id: 'msg-3',
        listItems: [
          '第 1 周：让产品、销售和支持团队就产品定位达成一致。',
          '第 2 周：邀请设计合作伙伴参与 Beta 测试，并汇总主要异议。',
          '第 3 周：完成发布物料、更新说明和新手引导。',
          '第 4 周：公开上线并监控激活率、留存率和支持请求量。',
        ],
        role: 'assistant',
        text: '这是一份精简的四周上线计划：',
      },
    ],
    modelId: 'gpt-5.4',
    preview: '包含发布时间线和关键指标的第三季度分析仪表盘上线计划。',
    searchModeId: 'deep-search',
    title: '第三季度上线计划',
    updatedAt: '18 分钟前',
    user: DEFAULT_USER,
  },
  {
    archived: false,
    id: 'rewrite-homepage-value-prop',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        text: '你能重写我们的首页价值主张，让它更贴合产品团队吗？',
      },
      {
        actions: 'full',
        id: 'msg-2',
        role: 'assistant',
        text: '可以。最快的改进方式是不再把它描述成通用 AI 工具，而是聚焦产品工作流、效率和决策清晰度。',
      },
      {
        actions: 'full',
        id: 'msg-3',
        listItems: [
          '将客户反馈转化为有优先级的产品决策。',
          '为产品经理和设计团队提供统一的研究、归纳与上线规划工作区。',
          '借助 AI 摘要和行动计划，缩短从洞察到路线图的时间。',
        ],
        role: 'assistant',
        text: '这里有三个更有力的定位方向：',
      },
    ],
    modelId: 'claude-4.6-sonnet',
    preview: '聚焦产品经理工作流和高效决策的首页文案。',
    searchModeId: 'quick-search',
    title: '重写首页价值主张',
    updatedAt: '1 小时前',
    user: DEFAULT_USER,
  },
  {
    archived: false,
    id: 'weekly-team-update-summary',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        text: '将本周的设计和工程更新汇总成一份可直接发给团队的进展说明。',
      },
      {
        actions: 'full',
        id: 'msg-2',
        role: 'assistant',
        text: '完成。我保持了内容精炼，并按进展、风险和下一步分组，可以直接粘贴到 Slack 或 Notion。',
      },
      {
        actions: 'full',
        id: 'msg-3',
        listItems: [
          '进展：仪表盘筛选功能已部署到预发布环境，新手引导流程正在进行质量验证。',
          '风险：一个 API 延迟回退问题仍在调查中。',
          '下一步：完善计费边界场景，并在下周启动设计系统审查。',
        ],
        role: 'assistant',
        text: '每周进展摘要：',
      },
    ],
    modelId: 'gemini-3.1-pro',
    preview: '可直接发给团队的产品、设计与工程更新摘要。',
    searchModeId: 'quick-search',
    title: '团队周报摘要',
    updatedAt: '昨天',
    user: DEFAULT_USER,
  },
] as const

export const DEFAULT_CHAT_THREAD_ID = CHAT_THREADS[0]?.id ?? ''

/** 按稳定 ID 获取只读 mock 会话。 */
export const getChatThread = (chatId: string) =>
  CHAT_THREADS.find((thread) => thread.id === chatId)
