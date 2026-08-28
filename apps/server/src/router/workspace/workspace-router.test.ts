import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { createApp } from '../../app.ts'

test('工作区目录选择拒绝非 Devaid Web 请求', async (context) => {
  const app = await createApp(
    await mkdtemp(join(tmpdir(), 'devaid-workspace-route-')),
  )
  context.after(() => app.close())

  const response = await app.request('/api/workspaces/select', {
    method: 'POST',
  })

  assert.equal(response.status, 403)
  assert.equal(
    ((await response.json()) as { code: string }).code,
    'WORKSPACE_PICKER_FORBIDDEN',
  )
})
