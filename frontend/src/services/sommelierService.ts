import axios from 'axios'
import { apiClient } from '../api/client'
import type { RecommendationResult, SommelierInput } from '../types/sommelier'

/** Upper bound on the wait; the backend itself caps the OpenAI call. */
const RECOMMENDATION_REQUEST_TIMEOUT_MS = 60_000

export class SommelierApiError extends Error {
  readonly status: number
  readonly details: string[]

  constructor(status: number, message: string, details: string[] = []) {
    super(message)
    this.name = 'SommelierApiError'
    this.status = status
    this.details = details
  }
}

function toSommelierApiError(error: unknown): SommelierApiError {
  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status
    const body = error.response.data as { details?: string[] }

    if (status === 400) {
      return new SommelierApiError(400, '需求內容有誤，請修改後再試', body.details ?? [])
    }
    if (status === 429) {
      return new SommelierApiError(429, '推薦次數過多，請稍後再試')
    }
    if (status === 503) {
      return new SommelierApiError(503, '侍酒師目前尚未開放，請稍後再試')
    }
    if (status === 504) {
      return new SommelierApiError(504, '挑選時間過長，請再試一次')
    }
    return new SommelierApiError(status, '推薦暫時無法使用，請稍後再試')
  }

  if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
    return new SommelierApiError(0, '挑選時間過長，請再試一次')
  }

  return new SommelierApiError(0, '無法連線到伺服器，請稍後再試')
}

export async function fetchRecommendations(input: SommelierInput): Promise<RecommendationResult> {
  try {
    const { data } = await apiClient.post<RecommendationResult>(
      '/sommelier/recommendations',
      input,
      { timeout: RECOMMENDATION_REQUEST_TIMEOUT_MS },
    )
    return data
  } catch (error) {
    throw toSommelierApiError(error)
  }
}
