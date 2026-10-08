import { Review } from '../models/Review'
import { User } from '../models/User'
import type { PublicReview } from '../types/review'
import {
  resolveUserRole,
  type AdminUserListItem,
} from '../types/user'
import { toPublicReview } from '../utils/toPublicReview'

export async function listUsersForAdmin(): Promise<AdminUserListItem[]> {
  const users = await User.find()
    .select('name email avatar role createdAt')
    .sort({ createdAt: -1 })
    .lean()

  return users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? '',
    role: resolveUserRole(user.role),
    createdAt: user.createdAt,
  }))
}

export async function listReviewsForAdmin(): Promise<PublicReview[]> {
  const reviews = await Review.find()
    .sort({ createdAt: -1 })
    .populate('userId', 'name')

  return reviews.map((review) => toPublicReview(review))
}
