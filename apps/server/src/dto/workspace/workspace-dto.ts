export interface CreateWorkspaceDto {
  path: string
}

export interface WorkspaceDto {
  available: boolean
  createdAt: number
  id: string
  name: string
}
