const compactNumber = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  notation: 'compact',
})

/** 将上下文占用换算为 UI 百分比并限制到完整圆环。 */
export const contextUsagePercent = (
  usedTokens: number,
  contextWindow: number,
) => Math.min(100, (usedTokens / contextWindow) * 100)

/** 避免把真实存在的低占用显示成 0%。 */
export const formatContextUsagePercent = (percent: number) =>
  percent > 0 && percent < 1 ? '<1%' : `${Math.round(percent)}%`

/** 使用稳定的 K/M 单位展示近似 token 数。 */
export const formatContextTokens = (tokens: number) =>
  compactNumber.format(tokens)
