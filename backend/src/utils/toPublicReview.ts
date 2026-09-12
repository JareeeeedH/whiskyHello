import type { Types } from 'mongoose'
import type { ReviewDocument } from '../models/Review'
import type { PublicReview } from '../types/review'

type PopulatedUserRef = {
  _id: Types.ObjectId
  name: string
}

function isPopulatedUser(value: unknown): value is PopulatedUserRef {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as { _id?: unknown; name?: unknown }
  return Boolean(candidate._id) && typeof candidate.name === 'string'
}

export function toPublicReview(review: ReviewDocument): PublicReview {
  const userRef = review.userId as unknown
  const populated = isPopulatedUser(userRef)

  const result: PublicReview = {
    id: review._id.toString(),
    userId: populated ? userRef._id.toString() : String(userRef),
    whiskyId: review.whiskyId,
    title: review.title,
    content: review.content,
    rating: review.rating,
    nose: review.nose,
    taste: review.taste,
    finish: review.finish,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  }

  if (populated) {
    result.authorName = userRef.name
  }

  return result
}
