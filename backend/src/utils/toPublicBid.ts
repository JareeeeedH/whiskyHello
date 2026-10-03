import type { Types } from 'mongoose'
import type { BidDocument } from '../models/Bid'
import type { PublicBid } from '../types/bid'

type PopulatedUserRef = {
  _id: Types.ObjectId
  name: string
}

function isPopulatedUser(value: unknown): value is PopulatedUserRef {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as { _id?: unknown; name?: unknown }
  return Boolean(candidate._id) && typeof candidate.name === 'string'
}

export function toPublicBid(bid: BidDocument): PublicBid {
  const userRef = bid.userId as unknown
  const populated = isPopulatedUser(userRef)

  const result: PublicBid = {
    id: bid._id.toString(),
    auctionId: bid.auctionId.toString(),
    userId: populated ? userRef._id.toString() : String(userRef),
    amount: bid.amount,
    createdAt: bid.createdAt,
    updatedAt: bid.updatedAt,
  }

  if (populated) {
    result.bidderName = userRef.name
  }

  return result
}
