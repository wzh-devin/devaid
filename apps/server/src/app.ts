import { AgentRuntime } from '@devaid/agent-runtime'
import {
  createProviderModels,
  FileCredentialStore,
  FileProviderConfigStore,
  getDefaultDataDirectory,
  ModelService,
  OAuthSessionService,
} from '@devaid/llm'
import { Hono } from 'hono'

import { createJsonlSessionRepository } from './infrastructure/session/jsonl-session.ts'
import { SessionIndex } from './infrastructure/session/session-index.ts'
import { WorkspaceStore } from './infrastructure/workspace/workspace-store.ts'
import { createApiRouter } from './router/index.ts'

export interface CreateAppOptions {
  models?: ModelService
}

export type DevaidApp = Hono & { close(): Promise<void> }

/** 创建 Devaid 本地后端业务应用。 */
export async function createApp(
  dataDirectory = process.env.DEVAID_DATA_DIR ?? getDefaultDataDirectory(),
  options: CreateAppOptions = {},
) {
  const app = new Hono() as DevaidApp
  let models = options.models
  if (!models) {
    const credentials = new FileCredentialStore(dataDirectory)
    const configurations = new FileProviderConfigStore(dataDirectory)
    await credentials.list()
    await configurations.list()
    models = new ModelService(createProviderModels(credentials), configurations)
  }
  const oauth = new OAuthSessionService(models.models)
  const repository = await createJsonlSessionRepository(dataDirectory)
  const sessionIndex = await SessionIndex.create(dataDirectory, repository)
  const workspaces = new WorkspaceStore(dataDirectory)
  await workspaces.list()
  const runtime = new AgentRuntime(models, repository, sessionIndex)
  let closed = false
  app.close = async () => {
    if (closed) return
    closed = true
    await runtime.close()
    await sessionIndex.close()
  }

  app.route('/api', createApiRouter(models, oauth, runtime, workspaces))

  return app
}
