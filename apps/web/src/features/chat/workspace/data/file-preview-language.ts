export const MAX_HIGHLIGHT_BYTES = 256 * 1024

const LANGUAGE_BY_EXTENSION: Readonly<Record<string, string>> = {
  bash: 'shellscript',
  cjs: 'javascript',
  css: 'css',
  cts: 'typescript',
  go: 'go',
  htm: 'html',
  html: 'html',
  java: 'java',
  js: 'javascript',
  json: 'json',
  jsonc: 'jsonc',
  jsonl: 'jsonl',
  jsx: 'jsx',
  less: 'less',
  md: 'markdown',
  mdx: 'mdx',
  mjs: 'javascript',
  mts: 'typescript',
  py: 'python',
  rs: 'rust',
  scss: 'scss',
  sh: 'shellscript',
  sql: 'sql',
  svelte: 'svelte',
  toml: 'toml',
  ts: 'typescript',
  tsx: 'tsx',
  vue: 'vue',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  zsh: 'shellscript',
}

/** 按文件扩展名选择受控的 Shiki 语言，大文件和未知类型保持纯文本。 */
export const getFilePreviewLanguage = (path: string, size: number) => {
  if (size > MAX_HIGHLIGHT_BYTES) return undefined

  const dotIndex = path.lastIndexOf('.')
  if (dotIndex <= path.lastIndexOf('/')) return undefined

  const extension = path.slice(dotIndex + 1).toLowerCase()
  return LANGUAGE_BY_EXTENSION[extension]
}
