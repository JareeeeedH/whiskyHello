import type { Types } from 'mongoose'

export type AuctionStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'ended'
  | 'cancelled'

/** Fields persisted on an Auction document. */
export interface AuctionAttrs {
  whiskyId: string
  createdBy: Types.ObjectId
  title: string
  description?: string
  startingPrice: number
  startAt: Date
  endAt: Date
  status: AuctionStatus
}

/** Auction shape returned from admin APIs. */
export interface PublicAuction {
  id: string
  whiskyId: string
  createdBy: string
  title: string
  description: string
  startingPrice: number
  startAt: Date
  endAt: Date
  status: AuctionStatus
  createdAt: Date
  updatedAt: Date
}
