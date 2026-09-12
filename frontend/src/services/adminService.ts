import type { AdminUserListItem } from '../types/admin'
import { apiClient } from '../api/client'

interface AdminUsersResponse {
  users: AdminUserListItem[]
}

export async function fetchAdminUsers(): Promise<AdminUserListItem[]> {
  const { data } = await apiClient.get<AdminUsersResponse>('/admin/users')
  return data.users
}
