import axios from 'axios'
import { apiClient } from '../api/client'
import type {
  AuctionDetailResponse,
  PublicAuctionDetail,
} from '../types/auction'

export class AuctionApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AuctionApiError'
    this.status = status
  }
}

function toAuctionApiError(error: unknown, fallbackMessage: string): AuctionApiError {
  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status
    const body = error.response.data as { message?: string }

    if (status === 400 || status === 404) {
      return new AuctionApiError(status, body.message ?? '找不到這場競標')
    }

    return new AuctionApiError(status, body.message ?? fallbackMessage)
  }

  return new AuctionApiError(0, '無法連線到伺服器，請稍後再試')
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
