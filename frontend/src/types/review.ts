export interface PublicReview {
  id: string
  userId: string
  whiskyId: string
  title: string
  content: string
  rating: number
  nose: string
  taste: string
  finish: string
  createdAt: string
  updatedAt: string
  authorName?: string
}

export interface CreateReviewPayload {
  whiskyId: string
  title: string
  content: string
  rating: number
  nose?: string
  taste?: string
  finish?: string
}

export interface UpdateReviewPayload {
  title?: string
  content?: string
  rating?: number
  nose?: string
  taste?: string
  finish?: string
}

export interface ReviewsResponse {
  reviews: PublicReview[]
}

export interface ReviewResponse {
  review: PublicReview
}
