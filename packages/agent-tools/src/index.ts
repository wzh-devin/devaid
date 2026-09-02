export {
  createWorkspaceTools,
  WORKSPACE_TOOLS_SYSTEM_PROMPT,
} from './workspace/toolset.ts'
export {
  createSkillResourceTool,
  type SkillResourceRoot,
} from './skills/read-resource.ts'
export {
  createAttachmentTool,
  type AttachmentResource,
} from './tools/attachment.ts'
export { createBashTool, parseBashInput } from './tools/bash.ts'
export type { BashInput, BashOutcome } from './tools/bash.ts'
export { WorkspaceExecutionEnv } from './workspace/execution-env.ts'
