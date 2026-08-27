import type { ModelService, OAuthSessionService } from '@devaid/llm'
import { Hono } from 'hono'

import { createHealthRouter } from './health/health-router.ts'
import { createCompletionRouter } from './llm/completion-router.ts'
import { createOAuthRouter } from './llm/oauth-router.ts'
import { createProviderRouter } from './llm/provider-router.ts'

/** 组合 Devaid 的全部 HTTP API 路由。 */
export function createApiRouter(
  models: ModelService,
  oauth: OAuthSessionService,
) {
  const router = new Hono()
  router.route('/health', createHealthRouter())
  router.route('/ai/providers', createProviderRouter(models, oauth))
  router.route('/ai/oauth', createOAuthRouter(oauth))
  router.route('/ai/completions', createCompletionRouter(models))
  return router
}
