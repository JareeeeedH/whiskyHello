import type { AuctionDocument } from '../models/Auction'
import type { PublicAuction } from '../types/auction'

export function toPublicAuction(auction: AuctionDocument): PublicAuction {
  return {
    id: auction._id.toString(),
    whiskyId: auction.whiskyId,
    createdBy: auction.createdBy.toString(),
    title: auction.title,
    description: auction.description ?? '',
    startingPrice: auction.startingPrice,
    startAt: auction.startAt,
    endAt: auction.endAt,
    status: auction.status,
    createdAt: auction.createdAt,
    updatedAt: auction.updatedAt,
  }
}
