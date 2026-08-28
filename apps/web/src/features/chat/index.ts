export { ChatComposer } from './composer/index.ts'
export type {
  ChatSubmitPayload,
  ComposerContextItem,
} from './composer/index.ts'
export { SUGGESTED_PROMPTS } from './data/index.ts'
export type { ChatActivePage, ChatThread } from './data/index.ts'
export {
  ApprovalPrompt,
  ThreadMessage,
  findPendingToolApproval,
} from './message/index.ts'
export type { ApprovalDecision } from './message/index.ts'
export {
  ChatNavbar,
  ChatSearchDialog,
  ChatSidebar,
} from './navigation/index.ts'
export {
  ChatWorkspaceContext,
  findWorkspaceByThreadId,
  resolveComposerWorkspace,
  useChatWorkspace,
  useWorkspaces,
  WorkspaceChangesPanel,
} from './workspace/index.ts'
export type { ChatWorkspace } from './workspace/index.ts'
export { createPendingChatThread, useAgentSessions } from './session/index.ts'
