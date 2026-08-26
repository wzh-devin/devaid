import {
  BranchesRight,
  Circle,
  Code,
  Envelope,
  EnvelopeOpen,
  LogoGithub,
  Magnifier,
  PencilToSquare,
  Play,
} from '@gravity-ui/icons'
import type { PluginConnectorId, PluginSkillId } from './plugin-connectors.ts'

export const PLUGIN_ICON_MAP = {
  github: LogoGithub,
  gmail: Envelope,
} satisfies Record<PluginConnectorId, typeof Code>

export const PLUGIN_SKILL_ICON_MAP = {
  'github-actions-diagnostics': Play,
  'github-issue-management': Circle,
  'github-pull-request-review': BranchesRight,
  'github-repository-search': Magnifier,
  'gmail-draft-compose': PencilToSquare,
  'gmail-message-read': EnvelopeOpen,
  'gmail-message-search': Magnifier,
} satisfies Record<PluginSkillId, typeof Code>
