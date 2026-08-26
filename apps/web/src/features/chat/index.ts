export { ChatComposer } from './composer/index.ts'
export type {
  ChatSubmitPayload,
  ComposerContextDisplayItem,
  ComposerContextItem,
} from './composer/index.ts'
export {
  CHAT_THREADS,
  DEFAULT_CHAT_THREAD_ID,
  getChatThread,
  SUGGESTED_PROMPTS,
} from './data/index.ts'
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
  findWorkspaceByDirectory,
  findWorkspaceByThreadId,
  INITIAL_CHAT_WORKSPACES,
  resolveComposerWorkspace,
  useChatWorkspace,
  WorkspaceChangesPanel,
} from './workspace/index.ts'
export type { ChatWorkspace } from './workspace/index.ts'
