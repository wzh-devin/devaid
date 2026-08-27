import { Hono } from 'hono'

import { healthController } from '../../controller/health/health-controller.ts'

/** 注册健康检查路由。 */
export function createHealthRouter() {
  const router = new Hono()
  router.get('/', healthController)
  return router
}
