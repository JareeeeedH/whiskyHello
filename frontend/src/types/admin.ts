import type { UserRole } from './auth'

export interface AdminUserListItem {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  createdAt: string
}
