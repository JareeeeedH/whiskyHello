import axios from 'axios'
import type {
  AdminAuction,
  AdminUserListItem,
  AuctionFormPayload,
} from '../types/admin'
import { apiClient } from '../api/client'

interface AdminUsersResponse {
  users: AdminUserListItem[]
}

interface AdminAuctionsResponse {
  auctions: AdminAuction[]
}

interface AdminAuctionResponse {
  auction: AdminAuction
}

export class AdminApiError extends Error {
  readonly status: number
  readonly details: string[]

  constructor(status: number, message: string, details: string[] = []) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
    this.details = details
  }
}

function toAdminApiError(error: unknown, fallbackMessage: string): AdminApiError {
  if (axios.isAxiosError(error) && error.response) {
    const body = error.response.data as {
      message?: string
      details?: string[]
    }
    return new AdminApiError(
      error.response.status,
      body.message ?? fallbackMessage,
      body.details ?? [],
    )
  }

  return new AdminApiError(0, 'Unable to reach the server. Please try again.')
}

export async function fetchAdminUsers(): Promise<AdminUserListItem[]> {
  const { data } = await apiClient.get<AdminUsersResponse>('/admin/users')
  return data.users
}

export async function fetchAdminAuctions(): Promise<AdminAuction[]> {
  try {
    const { data } =
      await apiClient.get<AdminAuctionsResponse>('/admin/auctions')
    return data.auctions
  } catch (error) {
    throw toAdminApiError(error, 'Unable to load auctions.')
  }
}

export async function createAdminAuction(
  payload: AuctionFormPayload,
): Promise<AdminAuction> {
  try {
    const { data } = await apiClient.post<AdminAuctionResponse>(
      '/admin/auctions',
      payload,
    )
    return data.auction
  } catch (error) {
    throw toAdminApiError(error, 'Unable to create auction.')
  }
}

export async function updateAdminAuction(
  id: string,
  payload: AuctionFormPayload,
): Promise<AdminAuction> {
  try {
    const { data } = await apiClient.patch<AdminAuctionResponse>(
      `/admin/auctions/${encodeURIComponent(id)}`,
      payload,
    )
    return data.auction
  } catch (error) {
    throw toAdminApiError(error, 'Unable to update auction.')
  }
}

export async function startAdminAuction(id: string): Promise<AdminAuction> {
  try {
    const { data } = await apiClient.post<AdminAuctionResponse>(
      `/admin/auctions/${encodeURIComponent(id)}/start`,
    )
    return data.auction
  } catch (error) {
    throw toAdminApiError(error, 'Unable to start auction.')
  }
}
