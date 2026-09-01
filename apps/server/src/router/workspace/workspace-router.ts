import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import { createWorkspaceController } from '../../controller/workspace/workspace-controller.ts'
import type { WorkspaceStore } from '../../infrastructure/workspace/workspace-store.ts'

const workspaceBodyLimit = bodyLimit({
  maxSize: 16 * 1024,
  onError: (context) =>
    context.json({ code: 'REQUEST_TOO_LARGE', message: '请求内容过大。' }, 413),
})

/** 注册本地工作区查询与创建路由。 */
export function createWorkspaceRouter(
  workspaces: WorkspaceStore,
  dataDirectory: string,
) {
  const router = new Hono()
  const controller = createWorkspaceController(workspaces, dataDirectory)
  router.get('/', controller.list)
  router.get('/:workspaceId/files/content', controller.readFile)
  router.post('/select', controller.select)
  router.post('/', workspaceBodyLimit, controller.create)
  return router
}
