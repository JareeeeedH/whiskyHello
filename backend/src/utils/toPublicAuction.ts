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
    statusHistory: (auction.statusHistory ?? []).map((change) => ({
      status: change.status,
      message: change.message,
      changedBy: change.changedBy.toString(),
      changedAt: change.changedAt,
    })),
    createdAt: auction.createdAt,
    updatedAt: auction.updatedAt,
  }
}
