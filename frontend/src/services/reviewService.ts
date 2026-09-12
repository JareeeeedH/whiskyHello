import axios from 'axios'
import { apiClient } from '../api/client'
import type {
  CreateReviewPayload,
  PublicReview,
  ReviewResponse,
  ReviewsResponse,
  UpdateReviewPayload,
} from '../types/review'

export class ReviewApiError extends Error {
  readonly status: number
  readonly details: string[]

  constructor(status: number, message: string, details: string[] = []) {
    super(message)
    this.name = 'ReviewApiError'
    this.status = status
    this.details = details
  }
}

function toReviewApiError(error: unknown, fallbackMessage: string): ReviewApiError {
  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status
    const body = error.response.data as {
      message?: string
      details?: string[]
    }

    if (status === 400) {
      return new ReviewApiError(
        400,
        body.message ?? '資料驗證失敗',
        body.details ?? [],
      )
    }

    if (status === 401) {
      return new ReviewApiError(401, body.message ?? '請先登入')
    }

    if (status === 403) {
      return new ReviewApiError(403, body.message ?? '只能操作自己的評論')
    }

    if (status === 404) {
      return new ReviewApiError(404, body.message ?? '找不到這則評論')
    }

    return new ReviewApiError(status, body.message ?? fallbackMessage)
  }

  return new ReviewApiError(0, '無法連線到伺服器，請稍後再試')
}

export async function fetchMyReviews(): Promise<PublicReview[]> {
  try {
    const { data } = await apiClient.get<ReviewsResponse>('/me/reviews')
    return data.reviews
  } catch (error) {
    throw toReviewApiError(error, '無法載入我的評論')
  }
}

export async function fetchReviewsByWhiskyId(
  whiskyId: string,
): Promise<PublicReview[]> {
  try {
    const { data } = await apiClient.get<ReviewsResponse>(
      `/whiskies/${encodeURIComponent(whiskyId)}/reviews`,
    )
    return data.reviews
  } catch (error) {
    throw toReviewApiError(error, '無法載入評論')
  }
}

export async function createReview(
  payload: CreateReviewPayload,
): Promise<PublicReview> {
  try {
    const { data } = await apiClient.post<ReviewResponse>('/reviews', payload)
    return data.review
  } catch (error) {
    throw toReviewApiError(error, '新增評論失敗')
  }
}

export async function updateReview(
  id: string,
  payload: UpdateReviewPayload,
): Promise<PublicReview> {
  try {
    const { data } = await apiClient.patch<ReviewResponse>(
      `/reviews/${encodeURIComponent(id)}`,
      payload,
    )
    return data.review
  } catch (error) {
    throw toReviewApiError(error, '更新評論失敗')
  }
}

export async function deleteReview(id: string): Promise<void> {
  try {
    await apiClient.delete(`/reviews/${encodeURIComponent(id)}`)
  } catch (error) {
    throw toReviewApiError(error, '刪除評論失敗')
  }
}
