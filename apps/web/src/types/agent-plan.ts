export type PlanStepState = 'pending' | 'active' | 'done' | 'skipped' | 'failed'

export interface PlanStep {
  /** Stable across plan revisions. */
  id: string
  text: string
  state: PlanStepState
  /** Why the step was skipped, failed, or what it produced. */
  note?: string
  /** Whether the agent added this step after the original plan. */
  added?: boolean
}

export interface AgentPlanProps {
  className?: string
  steps: readonly PlanStep[]
}
