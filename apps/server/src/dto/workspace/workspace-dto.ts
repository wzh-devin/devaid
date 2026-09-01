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
