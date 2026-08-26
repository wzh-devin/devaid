import assert from 'node:assert/strict'
import { resolveChatRoute } from './chat-route.ts'

assert.deepEqual(resolveChatRoute('/'), { kind: 'thread', threadId: '' })
assert.deepEqual(resolveChatRoute('/new'), { kind: 'new' })
assert.deepEqual(resolveChatRoute('/library'), { kind: 'library' })
assert.deepEqual(resolveChatRoute('/explore'), { kind: 'explore' })
assert.deepEqual(resolveChatRoute('/weekly-team-update-summary'), {
  kind: 'thread',
  threadId: 'weekly-team-update-summary',
})

console.log('chat route checks passed')
