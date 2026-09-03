export { ChatComposer } from './composer/index.ts'
export type {
  ChatSubmitPayload,
  ComposerContextItem,
} from './composer/index.ts'
export { SUGGESTED_PROMPTS } from './data/index.ts'
export type { ChatActivePage, ChatThread, ChatTodoItem } from './data/index.ts'
export { ApprovalPrompt, ThreadMessage } from './message/index.ts'
export type { ApprovalDecision } from './message/index.ts'
export {
  ChatNavbar,
  ChatSearchDialog,
  ChatSidebar,
} from './navigation/index.ts'
export {
  ChatWorkspaceContext,
  clearDefaultFileEditor,
  FileEditorOpenDialog,
  findWorkspaceByThreadId,
  getFileEditorPreference,
  openWorkspaceFile,
  resolveComposerWorkspace,
  selectFileEditor,
  setDefaultFileEditor,
  useChatWorkspace,
  useWorkspaces,
  WorkspaceApiError,
} from './workspace/index.ts'
export type { ChatWorkspace, FileEditorSelectionVo } from './workspace/index.ts'
export { createPendingChatThread, useAgentSessions } from './session/index.ts'
export type { PendingToolApprovalVo } from './session/index.ts'
