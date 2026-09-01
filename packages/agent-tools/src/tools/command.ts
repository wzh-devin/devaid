import { spawn } from 'node:child_process'
import { constants } from 'node:fs'
import { access, realpath } from 'node:fs/promises'
import {
  delimiter,
  isAbsolute,
  relative,
  resolve as resolvePath,
} from 'node:path'

import type { AgentTool } from '@earendil-works/pi-agent-core'

export interface CommandInput {
  args: string[]
  program: string
}

const MAX_ARGUMENTS = 128
const MAX_ARGUMENT_BYTES = 32 * 1024
const MAX_OUTPUT_BYTES = 256 * 1024
const TIMEOUT_MS = 60_000
const environmentKeys = [
  'HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'NODE_EXTRA_CA_CERTS',
  'PATH',
  'SSL_CERT_DIR',
  'SSL_CERT_FILE',
] as const

const parameters = {
  additionalProperties: false,
  properties: {
    args: {
      description: 'Arguments passed directly to the program without a shell',
      items: { type: 'string' },
      maxItems: MAX_ARGUMENTS,
      type: 'array',
    },
    program: {
      description: 'Executable name resolved from the server PATH',
      maxLength: 255,
      minLength: 1,
      type: 'string',
    },
  },
  required: ['program', 'args'],
  type: 'object',
} as unknown as AgentTool['parameters']

/** 同时供审批和执行使用，避免两处命令边界发生偏差。 */
export function parseCommandInput(input: unknown): CommandInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Command input is invalid.')
  }
  const values = input as Record<string, unknown>
  if (
    typeof values.program !== 'string' ||
    !values.program ||
    values.program.trim() !== values.program ||
    Buffer.byteLength(values.program) > 255 ||
    values.program.includes('\0') ||
    values.program.includes('/') ||
    values.program.includes('\\') ||
    !Array.isArray(values.args) ||
    values.args.length > MAX_ARGUMENTS ||
    values.args.some(
      (argument) => typeof argument !== 'string' || argument.includes('\0'),
    )
  ) {
    throw new Error('Command input is invalid.')
  }
  const program = values.program
  const args = values.args as string[]
  if (Buffer.byteLength(args.join('\0')) > MAX_ARGUMENT_BYTES) {
    throw new Error('Command arguments are too large.')
  }
  return { args: [...args], program }
}

const commandEnvironment = () =>
  Object.fromEntries(
    environmentKeys.flatMap((key) => {
      const value = process.env[key]
      return value === undefined ? [] : [[key, value]]
    }),
  )

const outputText = (stdout: Buffer[], stderr: Buffer[]) =>
  [
    Buffer.concat(stdout).toString('utf8'),
    Buffer.concat(stderr).toString('utf8'),
  ]
    .filter(Boolean)
    .join('\n')

const isWithin = (root: string, path: string) => {
  const child = relative(root, path)
  return child === '' || (!child.startsWith('..') && !isAbsolute(child))
}

const resolveExecutable = async (workspaceRoot: string, program: string) => {
  const names =
    process.platform === 'win32' && !program.toLowerCase().endsWith('.exe')
      ? [`${program}.exe`, program]
      : [program]
  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    if (!directory || !isAbsolute(directory)) continue
    for (const name of names) {
      const executable = await realpath(resolvePath(directory, name)).catch(
        () => undefined,
      )
      if (!executable || isWithin(workspaceRoot, executable)) continue
      const available = await access(executable, constants.X_OK)
        .then(() => true)
        .catch(() => false)
      if (available) return executable
    }
  }
  return undefined
}

/** 执行 PATH 中的通用程序；不接受 Shell、cwd、stdin 或环境变量。 */
export const createCommandTool = async (cwd: string): Promise<AgentTool> => {
  const workspaceRoot = await realpath(cwd)
  return {
    description:
      'Run an installed program with a structured argument array. Every call requires user approval.',
    label: 'command',
    name: 'command',
    parameters,
    async execute(_toolCallId, input, signal) {
      signal?.throwIfAborted()
      const command = parseCommandInput(input)
      const executable = await resolveExecutable(workspaceRoot, command.program)
      if (!executable) throw new Error(`${command.program} is unavailable.`)
      return new Promise((resolve, reject) => {
        const stdout: Buffer[] = []
        const stderr: Buffer[] = []
        let aborted = false
        let outputExceeded = false
        let outputSize = 0
        let settled = false
        let timedOut = false
        const child = spawn(executable, command.args, {
          cwd,
          env: commandEnvironment(),
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe'],
        })

        const cleanup = () => {
          clearTimeout(timer)
          signal?.removeEventListener('abort', onAbort)
        }
        const fail = (error: Error) => {
          if (settled) return
          settled = true
          cleanup()
          reject(error)
        }
        const succeed = (text: string) => {
          if (settled) return
          settled = true
          cleanup()
          resolve({
            content: [{ text: text || '(no output)', type: 'text' }],
            details: undefined,
          })
        }
        const stop = () => {
          child.kill('SIGKILL')
        }
        const collect = (target: Buffer[], chunk: Buffer) => {
          if (outputExceeded) return
          outputSize += chunk.byteLength
          if (outputSize > MAX_OUTPUT_BYTES) {
            outputExceeded = true
            stop()
            return
          }
          target.push(chunk)
        }
        const onAbort = () => {
          aborted = true
          stop()
        }
        const timer = setTimeout(() => {
          timedOut = true
          stop()
        }, TIMEOUT_MS)

        child.stdout.on('data', (chunk: Buffer) => collect(stdout, chunk))
        child.stderr.on('data', (chunk: Buffer) => collect(stderr, chunk))
        child.once('error', (error) =>
          fail(
            new Error(`${command.program} is unavailable.`, { cause: error }),
          ),
        )
        child.once('close', (code, childSignal) => {
          const output = outputText(stdout, stderr)
          if (aborted) return fail(new Error('Command aborted.'))
          if (timedOut)
            return fail(new Error('Command timed out after 60 seconds.'))
          if (outputExceeded)
            return fail(new Error('Command output exceeded 256 KiB.'))
          if (childSignal) {
            return fail(
              new Error(`Command terminated by signal ${childSignal}.`),
            )
          }
          if (code !== 0) {
            return fail(
              new Error(
                `${output ? `${output}\n\n` : ''}Command exited with code ${code}.`,
              ),
            )
          }
          succeed(output)
        })
        signal?.addEventListener('abort', onAbort, { once: true })
        if (signal?.aborted) onAbort()
      })
    },
  }
}
