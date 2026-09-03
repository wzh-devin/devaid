import type {
  AgentCapabilityCommand,
  AgentCapabilityDiagnostic,
  AgentCapabilitySkill,
} from '@oh-my-harness/agent-runtime'

export interface AgentCapabilityCatalogDto {
  commands: AgentCapabilityCommand[]
  diagnostics: AgentCapabilityDiagnostic[]
  skills: AgentCapabilitySkill[]
}
