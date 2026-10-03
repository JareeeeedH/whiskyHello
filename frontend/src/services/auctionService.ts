import axios from 'axios'
import { apiClient } from '../api/client'
import type {
  AuctionDetailResponse,
  AuctionListResponse,
  BidHistoryResponse,
  CreateBidPayload,
  CreateBidResponse,
  PublicAuctionDetail,
} from '../types/auction'

export class AuctionApiError extends Error {
  readonly status: number
  readonly details: string[]

  constructor(status: number, message: string, details: string[] = []) {
    super(message)
    this.name = 'AuctionApiError'
    this.status = status
    this.details = details
  }
}

function toAuctionApiError(error: unknown, fallbackMessage: string): AuctionApiError {
  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status
    const body = error.response.data as {
      message?: string
      details?: string[]
    }

    if (status === 400) {
      return new AuctionApiError(
        400,
        body.message ?? '資料驗證失敗',
        body.details ?? [],
      )
    }

    if (status === 401) {
      return new AuctionApiError(401, body.message ?? '請先登入')
    }

    if (status === 404) {
      return new AuctionApiError(404, body.message ?? '找不到這場競標')
    }

    return new AuctionApiError(status, body.message ?? fallbackMessage)
  }

  return new AuctionApiError(0, '無法連線到伺服器，請稍後再試')
}

export async function fetchAuctions(): Promise<PublicAuctionDetail[]> {
  try {
    const { data } = await apiClient.get<AuctionListResponse>('/auctions')
    return data.auctions
  } catch (error) {
    throw toAuctionApiError(error, '無法載入競標列表')
  }
}

export async function fetchAuctionById(id: string): Promise<PublicAuctionDetail> {
  try {
    const { data } = await apiClient.get<AuctionDetailResponse>(
      `/auctions/${encodeURIComponent(id)}`,
    )
    return data.auction
  } catch (error) {
    throw toAuctionApiError(error, '無法載入競標資訊')
  }
}

export async function fetchAuctionBids(id: string): Promise<BidHistoryResponse> {
  try {
    const { data } = await apiClient.get<BidHistoryResponse>(
      `/auctions/${encodeURIComponent(id)}/bids`,
    )
    return data
  } catch (error) {
    throw toAuctionApiError(error, '無法載入出價紀錄')
  }
}

export async function createAuctionBid(
  id: string,
  payload: CreateBidPayload,
): Promise<CreateBidResponse> {
  try {
    const { data } = await apiClient.post<CreateBidResponse>(
      `/auctions/${encodeURIComponent(id)}/bids`,
      payload,
    )
    return data
  } catch (error) {
    throw toAuctionApiError(error, '出價失敗')
  }
}
