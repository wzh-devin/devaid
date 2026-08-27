import {
  createProviderModels,
  FileCredentialStore,
  FileProviderConfigStore,
  ModelService,
  OAuthSessionService,
} from '@devaid/llm'
import { Hono } from 'hono'

import { createApiRouter } from './router/index.ts'

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

  app.route('/api', createApiRouter(models, oauth))

  return app
}
