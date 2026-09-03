import type { AgentRuntime } from '@oh-my-harness/agent-runtime'
import { Hono } from 'hono'

import { createAgentCapabilityController } from '../../controller/agent/capability-controller.ts'
import type { WorkspaceStore } from '../../infrastructure/workspace/workspace-store.ts'

/** 注册当前工作区真实 Skills 与命令目录。 */
export const createAgentCapabilityRouter = (
  runtime: AgentRuntime,
  workspaces: WorkspaceStore,
) => {
  const router = new Hono()
  router.get('/', createAgentCapabilityController(runtime, workspaces))
  return router
}
