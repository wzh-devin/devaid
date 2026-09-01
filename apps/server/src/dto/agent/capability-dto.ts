import type {
  AgentCapabilityCommand,
  AgentCapabilityDiagnostic,
  AgentCapabilitySkill,
} from '@devaid/agent-runtime'

export interface AgentCapabilityCatalogDto {
  commands: AgentCapabilityCommand[]
  diagnostics: AgentCapabilityDiagnostic[]
  skills: AgentCapabilitySkill[]
}
