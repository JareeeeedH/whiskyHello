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

/** One admin status change recorded on an auction (e.g. cancel). */
export interface PublicAuctionStatusChange {
  status: AuctionStatus
  message: string
  changedBy: string
  changedAt: Date
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
  statusHistory: PublicAuctionStatusChange[]
  createdAt: Date
  updatedAt: Date
}

/** Auction shape returned from public APIs (no creator id or admin status history). */
export type PublicAuctionDetail = Omit<PublicAuction, 'createdBy' | 'statusHistory'>
