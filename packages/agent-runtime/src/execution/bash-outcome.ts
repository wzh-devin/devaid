import type { BashOutcome } from '@devaid/agent-tools'

/** 只接受 Bash 工具定义的稳定结果字段，避免把任意 details 透传给客户端。 */
export function safeBashOutcome(value: unknown): BashOutcome | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return
  const outcome = value as Record<string, unknown>
  if (
    (typeof outcome.exitCode !== 'number' && outcome.exitCode !== null) ||
    typeof outcome.outputExceeded !== 'boolean' ||
    (typeof outcome.signal !== 'string' && outcome.signal !== null) ||
    typeof outcome.timedOut !== 'boolean'
  ) {
    return
  }
  return {
    exitCode: outcome.exitCode,
    outputExceeded: outcome.outputExceeded,
    signal: outcome.signal as NodeJS.Signals | null,
    timedOut: outcome.timedOut,
  }
}
