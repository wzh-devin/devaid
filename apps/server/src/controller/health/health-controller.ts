import type { Context } from 'hono'

/** 返回进程存活状态。 */
export const healthController = (context: Context) => context.json({ ok: true })
