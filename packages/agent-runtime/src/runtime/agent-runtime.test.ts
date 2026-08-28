import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'

import { FileProviderConfigStore, ModelService } from '@devaid/llm'
import { JsonlSessionRepo } from '@earendil-works/pi-agent-core'
import { NodeExecutionEnv } from '@earendil-works/pi-agent-core/node'
import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxThinking,
} from '@earendil-works/pi-ai'

import { AgentRuntime } from './agent-runtime.ts'
import type { AgentSessionProjection } from '../session/session-service.ts'

async function createFixture(
  options: {
    projection?: AgentSessionProjection
    tokensPerSecond?: number
  } = {},
) {
  const directory = await mkdtemp(join(tmpdir(), 'devaid-agent-runtime-'))
  const faux = fauxProvider({
    models: [{ id: 'test-model' }, { id: 'test-model-2' }],
    provider: 'test-provider',
    ...(options.tokensPerSecond === undefined
      ? {}
      : { tokensPerSecond: options.tokensPerSecond }),
  })
  const models = createModels()
  models.setProvider(faux.provider)
  const configurations = new FileProviderConfigStore(directory)
  await configurations.replace('test-provider', [
    { id: 'test-model', name: 'Test Model' },
    { id: 'test-model-2', name: 'Test Model 2' },
  ])
  const repository = new JsonlSessionRepo({
    fs: new NodeExecutionEnv({ cwd: directory }),
    sessionsRoot: join(directory, 'sessions'),
  })
  const service = new ModelService(models, configurations)
  const runtime = new AgentRuntime(service, repository, options.projection)
  return { directory, faux, repository, runtime, service }
}

test('目录投影失败不回滚 JSONL 事实', async () => {
  const unavailable: AgentSessionProjection = {
    async changed() {
      throw new Error('index unavailable')
    },
    async deleted() {
      throw new Error('index unavailable')
    },
    async list() {
      throw new Error('index unavailable')
    },
  }
  const fixture = await createFixture({ projection: unavailable })
  try {
    const created = await fixture.runtime.createSession({
      cwd: fixture.directory,
      modelId: 'test-model',
      name: '事实仍成功',
      providerId: 'test-provider',
    })
    assert.equal((await fixture.runtime.listSessions())[0]?.id, created.id)
    assert.equal(
      (await fixture.runtime.renameSession(created.id, '重命名仍成功')).name,
      '重命名仍成功',
    )
    assert.equal((await fixture.repository.list()).length, 1)
  } finally {
    await fixture.runtime.close()
  }
})

async function collect<T>(events: AsyncIterable<T>) {
  const result: T[] = []
  for await (const event of events) result.push(event)
  return result
}

test('Agent Runtime 持久化消息并可从 JSONL 恢复', async () => {
  const fixture = await createFixture()
  try {
    fixture.faux.setResponses([
      fauxAssistantMessage([fauxThinking('内部推理'), fauxText('持久化回答')]),
    ])
    const session = await fixture.runtime.createSession({
      cwd: fixture.directory,
      modelId: 'test-model',
      name: '测试会话',
      providerId: 'test-provider',
    })
    const run = await fixture.runtime.prompt(session.id, '你好')
    const events = await collect(run.events)
    assert.deepEqual(
      events.map((event) => event.type),
      ['start', 'reasoning_delta', 'text_delta', 'usage', 'done'],
    )

    const page = await fixture.runtime.getMessages(session.id, { limit: 20 })
    assert.deepEqual(
      page.items.map((message) => [message.role, message.content]),
      [
        ['user', '你好'],
        ['assistant', '持久化回答'],
      ],
    )
    assert.equal(page.items[1]?.reasoning, '内部推理')
    assert.equal(page.nextCursor, null)
    const updated = await fixture.runtime.updateSessionModel(session.id, {
      modelId: 'test-model-2',
      providerId: 'test-provider',
    })
    assert.equal(updated.modelId, 'test-model-2')

    await fixture.runtime.close()
    const reopenedRepository = new JsonlSessionRepo({
      fs: new NodeExecutionEnv({ cwd: fixture.directory }),
      sessionsRoot: join(fixture.directory, 'sessions'),
    })
    const reopened = new AgentRuntime(fixture.service, reopenedRepository)
    try {
      const restored = await reopened.getSession(session.id)
      assert.equal(restored.name, '测试会话')
      assert.equal(restored.modelId, 'test-model-2')
      assert.equal(restored.stats.messageCount, 2)
      assert.equal(
        (await reopened.getMessages(session.id, { limit: 20 })).items[1]
          ?.content,
        '持久化回答',
      )
    } finally {
      await reopened.close()
    }
  } finally {
    await fixture.runtime.close()
  }
})

test('同一会话只运行一个 Agent，并支持显式 abort', async () => {
  const fixture = await createFixture({ tokensPerSecond: 10 })
  try {
    fixture.faux.setResponses([
      fauxAssistantMessage('这是一段会被终止的较长响应。'.repeat(20)),
    ])
    const session = await fixture.runtime.createSession({
      cwd: fixture.directory,
      modelId: 'test-model',
      providerId: 'test-provider',
    })
    const run = await fixture.runtime.prompt(session.id, '开始')
    await assert.rejects(
      () => fixture.runtime.prompt(session.id, '并发消息'),
      /会话正在执行其他操作/,
    )
    await assert.rejects(
      () =>
        fixture.runtime.updateSessionModel(session.id, {
          modelId: 'test-model-2',
          providerId: 'test-provider',
        }),
      /会话正在执行其他操作/,
    )
    fixture.runtime.abort(session.id)
    const events = await collect(run.events)
    const lastEvent = events.at(-1)
    assert.equal(lastEvent?.type, 'error')
    assert.equal(
      lastEvent?.type === 'error' ? lastEvent.code : undefined,
      'AGENT_RUN_ABORTED',
    )
    assert.deepEqual(
      (await fixture.runtime.getMessages(session.id, { limit: 20 })).items.map(
        (message) => message.role,
      ),
      ['user', 'assistant'],
    )
  } finally {
    await fixture.runtime.close()
  }
})

test('消费者断开事件流后 Agent 继续运行并落库', async () => {
  const fixture = await createFixture({ tokensPerSecond: 100 })
  try {
    fixture.faux.setResponses([fauxAssistantMessage('后台完成')])
    const session = await fixture.runtime.createSession({
      cwd: fixture.directory,
      modelId: 'test-model',
      providerId: 'test-provider',
    })
    const run = await fixture.runtime.prompt(session.id, '断开连接')
    run.detach()

    let messages = await fixture.runtime.getMessages(session.id, { limit: 20 })
    for (
      let attempt = 0;
      attempt < 100 && messages.items.length < 2;
      attempt++
    ) {
      await delay(10)
      messages = await fixture.runtime.getMessages(session.id, { limit: 20 })
    }
    assert.deepEqual(
      messages.items.map((message) => [message.role, message.content]),
      [
        ['user', '断开连接'],
        ['assistant', '后台完成'],
      ],
    )
  } finally {
    await fixture.runtime.close()
  }
})

test('模型错误使用稳定事件且不暴露上游错误正文', async () => {
  const fixture = await createFixture()
  try {
    fixture.faux.setResponses([
      fauxAssistantMessage('', {
        errorMessage: 'upstream-secret-detail',
        stopReason: 'error',
      }),
    ])
    const session = await fixture.runtime.createSession({
      cwd: fixture.directory,
      modelId: 'test-model',
      providerId: 'test-provider',
    })
    const events = await collect(
      (await fixture.runtime.prompt(session.id, '触发错误')).events,
    )
    assert.deepEqual(events.at(-1), {
      code: 'AGENT_RUN_FAILED',
      message: '模型调用失败。',
      type: 'error',
    })
    assert.doesNotMatch(JSON.stringify(events), /upstream-secret-detail/)
  } finally {
    await fixture.runtime.close()
  }
})

test('尾部用户消息可 continue，Assistant 尾部拒绝重复继续', async () => {
  const fixture = await createFixture()
  try {
    const created = await fixture.runtime.createSession({
      cwd: fixture.directory,
      modelId: 'test-model',
      providerId: 'test-provider',
    })
    const metadata = (await fixture.repository.list()).find(
      (session) => session.id === created.id,
    )
    assert.ok(metadata)
    const session = await fixture.repository.open(metadata)
    await session.appendMessage({
      content: [{ text: '崩溃前已落库', type: 'text' }],
      role: 'user',
      timestamp: Date.now(),
    })
    fixture.faux.setResponses([fauxAssistantMessage('恢复完成')])
    const events = await collect(
      (await fixture.runtime.continue(created.id)).events,
    )
    assert.equal(events.at(-1)?.type, 'done')
    await assert.rejects(
      () => fixture.runtime.continue(created.id),
      /没有可继续的用户消息/,
    )
  } finally {
    await fixture.runtime.close()
  }
})

test('单条超大消息在调用模型前返回上下文错误', async () => {
  const fixture = await createFixture()
  try {
    const session = await fixture.runtime.createSession({
      cwd: fixture.directory,
      modelId: 'test-model',
      providerId: 'test-provider',
    })
    await assert.rejects(
      () => fixture.runtime.prompt(session.id, 'x'.repeat(1_000_000)),
      (error: unknown) =>
        !!error &&
        typeof error === 'object' &&
        (error as { code?: string }).code === 'CONTEXT_TOO_LARGE',
    )
    assert.equal(fixture.faux.state.callCount, 0)
  } finally {
    await fixture.runtime.close()
  }
})

test('长会话复用 Pi compaction entry 后继续运行', async () => {
  const fixture = await createFixture()
  try {
    const created = await fixture.runtime.createSession({
      cwd: fixture.directory,
      modelId: 'test-model',
      providerId: 'test-provider',
    })
    const metadata = (await fixture.repository.list()).find(
      (session) => session.id === created.id,
    )
    assert.ok(metadata)
    const session = await fixture.repository.open(metadata)
    for (let index = 0; index < 6; index++) {
      await session.appendMessage({
        content: [{ text: `${index}:${'x'.repeat(100_000)}`, type: 'text' }],
        role: 'user',
        timestamp: Date.now() + index,
      })
    }
    fixture.faux.setResponses([
      fauxAssistantMessage('压缩摘要'),
      fauxAssistantMessage('压缩后回答'),
    ])

    const events = await collect(
      (await fixture.runtime.prompt(created.id, '继续')).events,
    )
    assert.equal(events.at(-1)?.type, 'done')
    assert.equal(fixture.faux.state.callCount, 2)
    const restoredSession = await fixture.repository.open(metadata)
    assert.ok(
      (
        await restoredSession.findEntriesOnBranch({ order: 'oldestFirst' })
      ).some((entry) => entry.type === 'compaction'),
    )
  } finally {
    await fixture.runtime.close()
  }
})
