import { ToolPolicy } from '@oh-my-harness/agent-policy'
import { AgentRuntime } from '@oh-my-harness/agent-runtime'
import {
  createProviderModels,
  FileCredentialStore,
  FileProviderConfigStore,
  getDefaultDataDirectory,
  ModelService,
  OAuthSessionService,
} from '@oh-my-harness/llm'
import { Hono } from 'hono'

import { createJsonlSessionRepository } from './infrastructure/session/jsonl-session.ts'
import { SessionIndex } from './infrastructure/session/session-index.ts'
import { FileEditorService } from './infrastructure/workspace/file-editor-service.ts'
import { WorkspaceStore } from './infrastructure/workspace/workspace-store.ts'
import { createApiRouter } from './router/index.ts'

export interface CreateAppOptions {
  fileEditors?: FileEditorService
  models?: ModelService
}

export type OhMyHarnessApp = Hono & { close(): Promise<void> }

/** 创建 oh-my-harness 本地后端业务应用。 */
export async function createApp(
  dataDirectory = process.env.OH_MY_HARNESS_DATA_DIR ??
    getDefaultDataDirectory(),
  options: CreateAppOptions = {},
) {
  const app = new Hono() as OhMyHarnessApp
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
  const fileEditors =
    options.fileEditors ?? new FileEditorService(dataDirectory)
  await workspaces.list()
  const runtime = new AgentRuntime(models, repository, sessionIndex, {
    dataDirectory,
    policy: new ToolPolicy(),
    protectedRoots: [dataDirectory],
  })
  let closed = false
  app.close = async () => {
    if (closed) return
    closed = true
    await runtime.close()
    await sessionIndex.close()
  }

  app.route(
    '/api',
    createApiRouter(
      models,
      oauth,
      runtime,
      workspaces,
      dataDirectory,
      fileEditors,
    ),
  )

  return app
}
