export interface CreateWorkspaceDto {
  path: string
}

export interface WorkspaceDto {
  available: boolean
  createdAt: number
  id: string
  name: string
}

export interface WorkspaceFileDto {
  content: string
  modifiedAt: number
  path: string
  size: number
}

export interface FileEditorDto {
  name: string
}

export interface FileEditorSelectionDto extends FileEditorDto {
  selectionId: string
}

export interface FileEditorPreferenceDto {
  defaultEditor: FileEditorDto | null
  supported: boolean
}

export interface OpenWorkspaceFileDto {
  path: string
  remember?: boolean
  selectionId?: string
}
