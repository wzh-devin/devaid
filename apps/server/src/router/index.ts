import type { AgentRuntime } from '@oh-my-harness/agent-runtime'
import type { ModelService, OAuthSessionService } from '@oh-my-harness/llm'
import { Hono } from 'hono'

import { createAgentRunRouter } from './agent/run-router.ts'
import { createAgentCapabilityRouter } from './agent/capability-router.ts'
import { createAgentSessionRouter } from './agent/session-router.ts'
import { createHealthRouter } from './health/health-router.ts'
import { createCompletionRouter } from './llm/completion-router.ts'
import { createOAuthRouter } from './llm/oauth-router.ts'
import { createProviderRouter } from './llm/provider-router.ts'
import { createWorkspaceRouter } from './workspace/workspace-router.ts'
import type { FileEditorService } from '../infrastructure/workspace/file-editor-service.ts'
import type { WorkspaceStore } from '../infrastructure/workspace/workspace-store.ts'

/** 组合 oh-my-harness 的全部 HTTP API 路由。 */
export function createApiRouter(
  models: ModelService,
  oauth: OAuthSessionService,
  runtime: AgentRuntime,
  workspaces: WorkspaceStore,
  dataDirectory: string,
  fileEditors: FileEditorService,
) {
  const router = new Hono()
  router.route('/health', createHealthRouter())
  router.route('/ai/providers', createProviderRouter(models, oauth))
  router.route('/ai/oauth', createOAuthRouter(oauth))
  router.route('/ai/completions', createCompletionRouter(models))
  router.route('/agent/sessions', createAgentSessionRouter(runtime, workspaces))
  router.route('/agent/sessions', createAgentRunRouter(runtime))
  router.route(
    '/agent/capabilities',
    createAgentCapabilityRouter(runtime, workspaces),
  )
  router.route(
    '/workspaces',
    createWorkspaceRouter(workspaces, dataDirectory, runtime, fileEditors),
  )
  return router
}
