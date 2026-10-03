import type { AuctionStatus } from './admin'

/** Public auction detail from GET /api/v1/auctions/:id (no creator id). */
export interface PublicAuctionDetail {
  id: string
  whiskyId: string
  title: string
  description: string
  startingPrice: number
  startAt: string
  endAt: string
  status: AuctionStatus
  createdAt: string
  updatedAt: string
}

export interface AuctionDetailResponse {
  auction: PublicAuctionDetail
}

/** Public bid from /api/v1/auctions/:id/bids. */
export interface PublicBid {
  id: string
  auctionId: string
  userId: string
  amount: number
  createdAt: string
  updatedAt: string
  bidderName?: string
}

export interface BidHistoryResponse {
  bids: PublicBid[]
  currentPrice: number
}

export interface CreateBidPayload {
  amount: number
}

export interface CreateBidResponse {
  bid: PublicBid
  currentPrice: number
}
