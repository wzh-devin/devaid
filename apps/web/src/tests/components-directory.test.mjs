import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const sourceDirectory = fileURLToPath(new URL('../', import.meta.url))

const findInvalidComponentFiles = async (
  directory,
  isComponentDirectory = false,
  isFeatureDirectory = false,
) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const invalidFiles = []

  if (
    isComponentDirectory &&
    !entries.some((entry) => entry.isFile() && entry.name === 'index.ts')
  ) {
    invalidFiles.push(
      `${directory.replace(`${sourceDirectory}/`, '')}/index.ts`,
    )
  }

  for (const entry of entries) {
    const path = `${directory}/${entry.name}`

    if (entry.isDirectory()) {
      invalidFiles.push(
        ...(await findInvalidComponentFiles(
          path,
          isComponentDirectory || entry.name === 'components',
          isFeatureDirectory || entry.name === 'features',
        )),
      )
    } else if (
      isComponentDirectory &&
      entry.name !== 'index.ts' &&
      extname(entry.name) !== '.tsx'
    ) {
      invalidFiles.push(path.replace(`${sourceDirectory}/`, ''))
    } else if (
      isFeatureDirectory &&
      !isComponentDirectory &&
      extname(entry.name) === '.tsx'
    ) {
      invalidFiles.push(path.replace(`${sourceDirectory}/`, ''))
    } else if (
      isComponentDirectory &&
      extname(entry.name) === '.tsx' &&
      /\bexport\s+(?:interface|type)\s/u.test(await readFile(path, 'utf8'))
    ) {
      invalidFiles.push(`${path.replace(`${sourceDirectory}/`, '')}:type`)
    }
  }

  return invalidFiles
}

test('组件归入 components，共享类型由 types 维护', async () => {
  assert.deepEqual(await findInvalidComponentFiles(sourceDirectory), [])
})
