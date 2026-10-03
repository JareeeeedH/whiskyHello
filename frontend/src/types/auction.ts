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
