export { WorkspaceChangesPanel } from './components/index.ts'
export { ChatWorkspaceContext, useChatWorkspace } from './contexts/index.ts'
export {
  findWorkspaceByDirectory,
  findWorkspaceByThreadId,
  INITIAL_CHAT_WORKSPACES,
  resolveComposerWorkspace,
} from './data/index.ts'
export type {
  ChatWorkspace,
  WorkspaceDirectoryHandle,
  WorkspaceDirectoryPickerWindow,
} from './data/index.ts'
