import type { Types } from 'mongoose'

/** Fields persisted on a Bid document. */
export interface BidAttrs {
  auctionId: Types.ObjectId
  userId: Types.ObjectId
  amount: number
}

/** Public bid shape returned from APIs. */
export interface PublicBid {
  id: string
  auctionId: string
  userId: string
  amount: number
  createdAt: Date
  updatedAt: Date
  bidderName?: string
}
