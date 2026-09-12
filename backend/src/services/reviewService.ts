import { Types } from 'mongoose'
import { isObjectIdString, Review } from '../models/Review'
import type { PublicReview } from '../types/review'
import { AppError } from '../utils/AppError'
import { toPublicReview } from '../utils/toPublicReview'
import type {
  CreateReviewBody,
  UpdateReviewBody,
} from '../validations/reviewValidation'

export async function listReviewsByWhiskyId(
  whiskyId: string,
): Promise<PublicReview[]> {
  const reviews = await Review.find({ whiskyId })
    .sort({ createdAt: -1 })
    .populate('userId', 'name')

  return reviews.map((review) => toPublicReview(review))
}

export async function createReview(
  userId: string,
  input: CreateReviewBody,
): Promise<PublicReview> {
  const review = await Review.create({
    userId: new Types.ObjectId(userId),
    whiskyId: input.whiskyId,
    title: input.title,
    content: input.content,
    rating: input.rating,
    nose: input.nose ?? '',
    taste: input.taste ?? '',
    finish: input.finish ?? '',
  })

  await review.populate('userId', 'name')
  return toPublicReview(review)
}

export async function updateReview(
  reviewId: string,
  userId: string,
  input: UpdateReviewBody,
): Promise<PublicReview> {
  if (!isObjectIdString(reviewId)) {
    throw new AppError(400, 'Invalid review id')
  }

  const review = await Review.findById(reviewId)
  if (!review) {
    throw new AppError(404, 'Review not found')
  }

  if (review.userId.toString() !== userId) {
    throw new AppError(403, 'You can only update your own reviews')
  }

  if (input.title !== undefined) review.title = input.title
  if (input.content !== undefined) review.content = input.content
  if (input.rating !== undefined) review.rating = input.rating
  if (input.nose !== undefined) review.nose = input.nose
  if (input.taste !== undefined) review.taste = input.taste
  if (input.finish !== undefined) review.finish = input.finish

  await review.save()
  await review.populate('userId', 'name')
  return toPublicReview(review)
}

export async function deleteReview(
  reviewId: string,
  userId: string,
): Promise<void> {
  if (!isObjectIdString(reviewId)) {
    throw new AppError(400, 'Invalid review id')
  }

  const review = await Review.findById(reviewId)
  if (!review) {
    throw new AppError(404, 'Review not found')
  }

  if (review.userId.toString() !== userId) {
    throw new AppError(403, 'You can only delete your own reviews')
  }

  await review.deleteOne()
}

export async function listMyReviews(userId: string): Promise<PublicReview[]> {
  const reviews = await Review.find({ userId })
    .sort({ createdAt: -1 })
    .populate('userId', 'name')

  return reviews.map((review) => toPublicReview(review))
}
