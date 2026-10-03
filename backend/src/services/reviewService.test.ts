/**
 * Review service regression tests against a real MongoDB.
 * Requires TEST_MONGODB_URI (dedicated test database).
 */
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import mongoose from 'mongoose'
import { User } from '../models/User'
import { Review } from '../models/Review'
import {
  createReview,
  deleteReview,
  updateReview,
} from './reviewService'
import {
  connectTestDatabase,
  disconnectTestDatabase,
} from '../test/testDatabase'
import { AppError } from '../utils/AppError'
import { hashPassword } from '../utils/password'

let ownerId = ''
let otherId = ''
let reviewId = ''

describe('reviewService (integration)', () => {
  before(async () => {
    await connectTestDatabase()

    await Promise.all([
      User.deleteMany({ email: /^qa-review-/ }),
      Review.deleteMany({ whiskyId: 'qa-whisky-1' }),
    ])

    const [owner, other] = await User.create([
      {
        name: 'QA Owner',
        email: `qa-review-owner-${Date.now()}@example.com`,
        passwordHash: await hashPassword('password123'),
      },
      {
        name: 'QA Other',
        email: `qa-review-other-${Date.now()}@example.com`,
        passwordHash: await hashPassword('password123'),
      },
    ])

    ownerId = owner.id
    otherId = other.id
  })

  after(async () => {
    if (mongoose.connection.readyState !== 1) {
      return
    }
    await Promise.all([
      Review.deleteMany({ whiskyId: 'qa-whisky-1' }),
      User.deleteMany({ _id: { $in: [ownerId, otherId] } }),
    ])
    await disconnectTestDatabase()
  })

  it('creates a review for the authenticated user', async () => {
    const review = await createReview(ownerId, {
      whiskyId: 'qa-whisky-1',
      title: 'QA create',
      content: 'Created in regression test',
      rating: 90,
    })

    reviewId = review.id
    assert.equal(review.userId, ownerId)
    assert.equal(review.rating, 90)
    assert.equal(review.title, 'QA create')
  })

  it('rejects update from a non-owner', async () => {
    await assert.rejects(
      () =>
        updateReview(reviewId, otherId, {
          title: 'Hijacked',
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 403 &&
        /own reviews/i.test(err.message),
    )
  })

  it('allows update from the owner', async () => {
    const updated = await updateReview(reviewId, ownerId, {
      title: 'QA updated',
      rating: 91,
    })
    assert.equal(updated.title, 'QA updated')
    assert.equal(updated.rating, 91)
  })

  it('rejects delete from a non-owner', async () => {
    await assert.rejects(
      () => deleteReview(reviewId, otherId),
      (err: unknown) =>
        err instanceof AppError && err.statusCode === 403,
    )
  })

  it('rejects invalid review ObjectId', async () => {
    await assert.rejects(
      () => deleteReview('not-valid-id', ownerId),
      (err: unknown) =>
        err instanceof AppError && err.statusCode === 400,
    )
  })

  it('allows delete from the owner', async () => {
    await deleteReview(reviewId, ownerId)
    const gone = await Review.findById(reviewId)
    assert.equal(gone, null)
  })
})
