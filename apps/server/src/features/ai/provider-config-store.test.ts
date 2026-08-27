import assert from 'node:assert/strict'
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { FileProviderConfigStore } from './provider-config-store.ts'

test('Provider Config Store 串行原子保存显式模型并限制权限', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devaid-provider-config-'))
  const store = new FileProviderConfigStore(directory)

  await Promise.all([
    store.replace('deepseek', [{ id: 'first', name: 'first' }]),
    store.replace('deepseek', [{ id: 'second', name: 'second' }]),
  ])

  assert.deepEqual(await store.read('deepseek'), [
    { id: 'second', name: 'second' },
  ])
  assert.equal(JSON.parse(await readFile(store.filePath, 'utf8')).version, 1)
  if (process.platform !== 'win32') {
    assert.equal((await stat(directory)).mode & 0o777, 0o700)
    assert.equal((await stat(store.filePath)).mode & 0o777, 0o600)
  }
})

test('Provider Config Store 损坏时失败关闭且保留原文件', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devaid-config-corrupt-'))
  const store = new FileProviderConfigStore(directory)
  await writeFile(store.filePath, '{broken', 'utf8')

  await assert.rejects(() => store.list(), /文件损坏/)
  assert.equal(await readFile(store.filePath, 'utf8'), '{broken')
})
