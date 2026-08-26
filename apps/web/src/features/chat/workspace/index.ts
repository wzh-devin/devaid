export { WorkspaceChangesPanel } from './WorkspaceChangesPanel.tsx'
export { ChatWorkspaceContext, useChatWorkspace } from './workspace-context.ts'
export {
  findWorkspaceByDirectory,
  findWorkspaceByThreadId,
  INITIAL_CHAT_WORKSPACES,
  resolveComposerWorkspace,
} from './workspace-data.ts'
export type {
  ChatWorkspace,
  WorkspaceDirectoryHandle,
  WorkspaceDirectoryPickerWindow,
} from './workspace-data.ts'
