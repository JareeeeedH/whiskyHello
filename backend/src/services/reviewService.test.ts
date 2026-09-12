/**
 * Review service regression tests against a real MongoDB.
 * Skips the suite when MONGODB_URI is unreachable (no new test infra required).
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
import { AppError } from '../utils/AppError'
import { hashPassword } from '../utils/password'

const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/whiskyhello_test'

let mongoReady = false
let ownerId = ''
let otherId = ''
let reviewId = ''

describe('reviewService (integration)', () => {
  before(async () => {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 })
      mongoReady = true

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
    } catch {
      mongoReady = false
    }
  })

  after(async () => {
    if (!mongoReady) {
      return
    }
    await Promise.all([
      Review.deleteMany({ whiskyId: 'qa-whisky-1' }),
      User.deleteMany({ _id: { $in: [ownerId, otherId] } }),
    ])
    await mongoose.disconnect()
  })

  it('creates a review for the authenticated user', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

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

  it('rejects update from a non-owner', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

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

  it('allows update from the owner', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const updated = await updateReview(reviewId, ownerId, {
      title: 'QA updated',
      rating: 91,
    })
    assert.equal(updated.title, 'QA updated')
    assert.equal(updated.rating, 91)
  })

  it('rejects delete from a non-owner', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    await assert.rejects(
      () => deleteReview(reviewId, otherId),
      (err: unknown) =>
        err instanceof AppError && err.statusCode === 403,
    )
  })

  it('rejects invalid review ObjectId', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    await assert.rejects(
      () => deleteReview('not-valid-id', ownerId),
      (err: unknown) =>
        err instanceof AppError && err.statusCode === 400,
    )
  })

  it('allows delete from the owner', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    await deleteReview(reviewId, ownerId)
    const gone = await Review.findById(reviewId)
    assert.equal(gone, null)
  })
})
