import { dirname, join } from 'node:path'

import {
  formatPromptTemplateInvocation,
  loadSourcedPromptTemplates,
  loadSourcedSkills,
  parseCommandArgs,
  type PromptTemplate,
  type Skill,
} from '@earendil-works/pi-agent-core'
import { NodeExecutionEnv } from '@earendil-works/pi-agent-core/node'

import { AgentRuntimeError } from '../error/agent-runtime-error.ts'

export type AgentSkillSource = 'user'
export type AgentCommandSource = 'builtin' | 'project' | 'user'
export type AgentCapabilitySource = AgentCommandSource | AgentSkillSource

export interface AgentCapabilityDiagnostic {
  code: string
  message: string
  source: AgentCapabilitySource
}

export interface AgentCapabilitySkill {
  description: string
  enabled: boolean
  id: string
  name: string
  source: AgentSkillSource
}

export interface AgentCapabilityCommand {
  description: string
  id: string
  name: string
  source: AgentCommandSource
}

export interface AgentCapabilityCatalog {
  commands: AgentCapabilityCommand[]
  diagnostics: AgentCapabilityDiagnostic[]
  skills: AgentCapabilitySkill[]
}

export interface ResolvedSkill extends AgentCapabilitySkill {
  content: string
  rootDirectory: string
}

export interface LoadedCommand extends AgentCapabilityCommand {
  template: PromptTemplate
}

export interface LoadedSkill extends ResolvedSkill {
  disableModelInvocation: boolean
}

export interface LoadedCatalog {
  commands: LoadedCommand[]
  diagnostics: AgentCapabilityDiagnostic[]
  skills: LoadedSkill[]
}

const MAX_CAPABILITY_CONTENT = 200_000
const CATALOG_CACHE_MS = 5_000
const capabilityNamePattern = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u

const BUILTIN_COMMANDS: readonly PromptTemplate[] = [
  {
    content:
      '先为下面的请求制定一份简洁、可执行的计划；除非用户明确要求，否则本轮只输出计划，不开始实施。\n\n$ARGUMENTS',
    description: '先整理任务步骤，本轮只输出计划。',
    name: 'plan',
  },
  {
    content:
      '审查下面的请求或当前工作区改动，优先指出正确性、安全性和回归风险，并给出可验证的结论。\n\n$ARGUMENTS',
    description: '检查当前工作区改动与潜在风险。',
    name: 'review',
  },
]

const skillId = (name: string) => `skill:${name}`
const commandId = (name: string) => `command:${name}`

const safeDiagnostic = (
  code: string,
  source: AgentCapabilitySource,
): AgentCapabilityDiagnostic => ({
  code,
  message: '能力文件无效，请检查对应目录。',
  source,
})

const deduplicate = <T extends { name: string; source: string }>(
  values: T[],
  diagnostics: AgentCapabilityDiagnostic[],
) => {
  const duplicateKeys = new Set<string>()
  const seenKeys = new Set<string>()
  for (const value of values) {
    const key = `${value.source}:${value.name}`
    if (seenKeys.has(key)) duplicateKeys.add(key)
    seenKeys.add(key)
  }
  for (const key of duplicateKeys) {
    diagnostics.push(
      safeDiagnostic(
        'duplicate_name',
        key.split(':', 1)[0] as AgentCapabilitySource,
      ),
    )
  }
  return values.filter(
    (value) => !duplicateKeys.has(`${value.source}:${value.name}`),
  )
}

const preferHigherPriority = <
  T extends { name: string; source: AgentCapabilitySource },
>(
  values: T[],
) => {
  const byName = new Map<string, T>()
  const sourcePriority: Record<AgentCapabilitySource, number> = {
    builtin: 0,
    user: 3,
    project: 4,
  }
  for (const value of values) {
    const current = byName.get(value.name)
    if (
      !current ||
      sourcePriority[value.source] > sourcePriority[current.source]
    ) {
      byName.set(value.name, value)
    }
  }
  return [...byName.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  )
}

/** 从 Devaid 用户目录加载 Skills，并从用户及项目目录加载命令。 */
export class AgentCapabilityService {
  // ponytail: 5s TTL keeps discovery cheap; replace with file watching only if live edits require it.
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: Promise<LoadedCatalog> }
  >()
  private readonly dataDirectory: string

  constructor(dataDirectory: string) {
    this.dataDirectory = dataDirectory
  }

  async list(cwd: string): Promise<AgentCapabilityCatalog> {
    const catalog = await this.load(cwd)
    return {
      commands: catalog.commands.map(
        ({ template: _template, ...command }) => command,
      ),
      diagnostics: catalog.diagnostics,
      skills: catalog.skills.map(
        ({
          content: _content,
          disableModelInvocation: _disabled,
          rootDirectory: _root,
          ...skill
        }) => skill,
      ),
    }
  }

  async resolve(
    cwd: string,
    input: {
      commandId?: string
      content: string
      skillIds?: readonly string[]
    },
  ) {
    const catalog = await this.load(cwd)
    const skills = (input.skillIds ?? []).map((id) => {
      const skill = catalog.skills.find((candidate) => candidate.id === id)
      if (!skill) {
        throw new AgentRuntimeError(
          'AGENT_SKILL_NOT_FOUND',
          '所选 Skill 不存在或不可用。',
          400,
        )
      }
      return skill
    })
    const command = input.commandId
      ? catalog.commands.find((candidate) => candidate.id === input.commandId)
      : undefined
    if (input.commandId && !command) {
      throw new AgentRuntimeError(
        'AGENT_COMMAND_NOT_FOUND',
        '所选命令不存在或不可用。',
        400,
      )
    }
    return {
      catalog,
      command,
      commandContent: command
        ? formatPromptTemplateInvocation(
            command.template,
            parseCommandArgs(input.content),
          )
        : undefined,
      skills,
    }
  }

  private async load(cwd: string): Promise<LoadedCatalog> {
    const cached = this.cache.get(cwd)
    if (cached && cached.expiresAt > Date.now()) return cached.value
    const value = this.loadUncached(cwd)
    this.cache.set(cwd, { expiresAt: Date.now() + CATALOG_CACHE_MS, value })
    return value.catch((error: unknown) => {
      if (this.cache.get(cwd)?.value === value) this.cache.delete(cwd)
      throw error
    })
  }

  private async loadUncached(cwd: string): Promise<LoadedCatalog> {
    const env = new NodeExecutionEnv({ cwd })
    try {
      const [loadedSkills, loadedCommands] = await Promise.all([
        loadSourcedSkills(env, [
          { path: join(this.dataDirectory, 'skills'), source: 'user' as const },
        ]),
        loadSourcedPromptTemplates(env, [
          {
            path: join(this.dataDirectory, 'commands'),
            source: 'user' as const,
          },
          {
            path: join(cwd, '.agents', 'commands'),
            source: 'project' as const,
          },
        ]),
      ])
      const diagnostics: AgentCapabilityDiagnostic[] = [
        ...loadedSkills.diagnostics.map((item) =>
          safeDiagnostic(item.code, item.source),
        ),
        ...loadedCommands.diagnostics.map((item) =>
          safeDiagnostic(item.code, item.source),
        ),
      ]
      const skills = deduplicate(
        loadedSkills.skills.flatMap(({ skill, source }) =>
          this.validSkill(skill)
            ? [
                {
                  content: skill.content,
                  description: skill.description,
                  disableModelInvocation: skill.disableModelInvocation === true,
                  enabled: true,
                  id: skillId(skill.name),
                  name: skill.name,
                  rootDirectory: dirname(skill.filePath),
                  source,
                },
              ]
            : (diagnostics.push(safeDiagnostic('invalid_skill', source)), []),
        ),
        diagnostics,
      )
      const commands = deduplicate(
        loadedCommands.promptTemplates.flatMap(({ promptTemplate, source }) =>
          this.validCommand(promptTemplate)
            ? [
                {
                  description:
                    promptTemplate.description || promptTemplate.name,
                  id: commandId(promptTemplate.name),
                  name: promptTemplate.name,
                  source,
                  template: promptTemplate,
                },
              ]
            : (diagnostics.push(safeDiagnostic('invalid_command', source)), []),
        ),
        diagnostics,
      )
      return {
        commands: preferHigherPriority([
          ...BUILTIN_COMMANDS.map((template) => ({
            description: template.description || template.name,
            id: commandId(template.name),
            name: template.name,
            source: 'builtin' as const,
            template,
          })),
          ...commands,
        ]),
        diagnostics,
        skills: preferHigherPriority(skills),
      }
    } finally {
      await env.cleanup()
    }
  }

  private validSkill(skill: Skill) {
    return (
      capabilityNamePattern.test(skill.name) &&
      skill.description.length <= 1_024 &&
      skill.content.length <= MAX_CAPABILITY_CONTENT
    )
  }

  private validCommand(command: PromptTemplate) {
    return (
      capabilityNamePattern.test(command.name) &&
      (command.description?.length ?? 0) <= 1_024 &&
      command.content.length <= MAX_CAPABILITY_CONTENT
    )
  }
}
