import type { UserRole } from './auth'

export interface AdminUserListItem {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  createdAt: string
}

export type AuctionStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'ended'
  | 'cancelled'

export interface AdminAuction {
  id: string
  whiskyId: string
  createdBy: string
  title: string
  description: string
  startingPrice: number
  startAt: string
  endAt: string
  status: AuctionStatus
  createdAt: string
  updatedAt: string
}

export interface AuctionFormPayload {
  whiskyId: string
  title: string
  description: string
  startingPrice: number
  startAt: string
  endAt: string
}
