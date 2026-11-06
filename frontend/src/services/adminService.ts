import type { AdminUserListItem } from '../types/admin'
import type { PublicReview, ReviewsResponse } from '../types/review'
import { apiClient } from '../api/client'

interface AdminUsersResponse {
  users: AdminUserListItem[]
}

export async function fetchAdminUsers(): Promise<AdminUserListItem[]> {
  const { data } = await apiClient.get<AdminUsersResponse>('/admin/users')
  return data.users
}

export async function fetchAdminReviews(): Promise<PublicReview[]> {
  const { data } = await apiClient.get<ReviewsResponse>('/admin/reviews')
  return data.reviews
}
