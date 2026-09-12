import type { Types } from 'mongoose'

/** Fields persisted on a Review document. */
export interface ReviewAttrs {
  userId: Types.ObjectId
  whiskyId: string
  title: string
  content: string
  rating: number
  nose: string
  taste: string
  finish: string
}

/** Public review shape returned from APIs. */
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
  createdAt: Date
  updatedAt: Date
  authorName?: string
}
