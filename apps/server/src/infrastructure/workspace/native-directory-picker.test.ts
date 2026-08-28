import assert from 'node:assert/strict'
import test from 'node:test'

import { WorkspaceError } from './workspace-store.ts'
import { selectNativeWorkspaceDirectory } from './native-directory-picker.ts'

test('macOS 原生目录选择器返回路径并识别用户取消', async () => {
  assert.equal(
    await selectNativeWorkspaceDirectory({
      platform: 'darwin',
      run: async () => ({ stdout: '/tmp/devaid-workspace/\n' }),
    }),
    '/tmp/devaid-workspace/',
  )
  assert.equal(
    await selectNativeWorkspaceDirectory({
      platform: 'darwin',
      run: async () =>
        Promise.reject({ stderr: 'execution error: User canceled. (-128)' }),
    }),
    null,
  )
})

test('非 macOS 平台返回稳定的 unavailable 错误', async () => {
  await assert.rejects(
    selectNativeWorkspaceDirectory({ platform: 'linux' }),
    (error) =>
      error instanceof WorkspaceError &&
      error.code === 'WORKSPACE_PICKER_UNAVAILABLE' &&
      error.status === 501,
  )
})
