import { Hono } from 'hono'

import { FileCredentialStore } from './features/ai/credential-store.ts'
import { ModelService } from './features/ai/model-service.ts'
import { OAuthSessionService } from './features/ai/oauth-session-service.ts'
import { FileProviderConfigStore } from './features/ai/provider-config-store.ts'
import { createProviderModels } from './features/ai/providers.ts'
import { createCompletionRoutes } from './features/ai/routes/completions.ts'
import { createOAuthRoutes } from './features/ai/routes/oauth.ts'
import { createProviderRoutes } from './features/ai/routes/providers.ts'

/** 创建 Devaid 本地后端业务应用。 */
export async function createApp(dataDirectory?: string) {
  const app = new Hono()
  const credentials = new FileCredentialStore(dataDirectory)
  const configurations = new FileProviderConfigStore(dataDirectory)
  await credentials.list()
  await configurations.list()
  const models = new ModelService(
    createProviderModels(credentials),
    configurations,
  )
  const oauth = new OAuthSessionService(models.models)

  app.get('/api/health', (c) => c.json({ ok: true }))
  app.route('/api/ai/providers', createProviderRoutes(models, oauth))
  app.route('/api/ai/oauth', createOAuthRoutes(oauth))
  app.route('/api/ai/completions', createCompletionRoutes(models))

  return app
}
