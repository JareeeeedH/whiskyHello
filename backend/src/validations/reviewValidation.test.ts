import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createReviewSchema,
  reviewIdParamsSchema,
  updateReviewSchema,
} from './reviewValidation'

describe('reviewValidation', () => {
  it('accepts a valid create payload', () => {
    const { error, value } = createReviewSchema.validate({
      whiskyId: '1385',
      title: 'Nice dram',
      content: 'Smooth and coastal.',
      rating: 88,
    })
    assert.equal(error, undefined)
    assert.equal(value.rating, 88)
  })

  it('rejects non-integer rating', () => {
    const { error } = createReviewSchema.validate({
      whiskyId: '1385',
      title: 'Nice dram',
      content: 'Smooth and coastal.',
      rating: 88.5,
    })
    assert.ok(error)
  })

  it('rejects rating above 100', () => {
    const { error } = createReviewSchema.validate({
      whiskyId: '1385',
      title: 'Nice dram',
      content: 'Smooth and coastal.',
      rating: 101,
    })
    assert.ok(error)
  })

  it('rejects invalid review ObjectId params', () => {
    const { error } = reviewIdParamsSchema.validate({ id: 'not-an-object-id' })
    assert.ok(error)
  })

  it('accepts a valid 24-hex review id', () => {
    const { error } = reviewIdParamsSchema.validate({
      id: '507f1f77bcf86cd799439011',
    })
    assert.equal(error, undefined)
  })

  it('rejects empty update body', () => {
    const { error } = updateReviewSchema.validate({})
    assert.ok(error)
  })
})
