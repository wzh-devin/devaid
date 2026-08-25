import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from 'react'

export const PERMISSION_OPTIONS = [
  { id: 'read-only', label: 'Read Only' },
  { id: 'workspace-write', label: 'Workspace Write' },
  { id: 'danger-full-access', label: 'Full access' },
] as const

export type PermissionId = (typeof PERMISSION_OPTIONS)[number]['id']

interface PermissionSettingsContextValue {
  permission: PermissionId
  setPermission: Dispatch<SetStateAction<PermissionId>>
}

export const PermissionSettingsContext =
  createContext<PermissionSettingsContextValue | null>(null)

/** 读取当前页面会话的工作区权限选择。 */
export const usePermissionSettings = () => {
  const permissionSettings = useContext(PermissionSettingsContext)

  if (!permissionSettings) {
    throw new Error(
      'usePermissionSettings 必须在 PermissionSettingsContext.Provider 内使用。',
    )
  }

  return permissionSettings
}
