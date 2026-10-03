import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  auctionIdParamsSchema,
  cancelAuctionSchema,
  createAuctionSchema,
  updateAuctionSchema,
} from './auctionValidation'

const validCreate = {
  whiskyId: 'macallan-18',
  title: 'Macallan 18',
  startingPrice: 0,
  startAt: '2026-10-10T00:00:00.000Z',
  endAt: '2026-10-12T00:00:00.000Z',
}

describe('auctionValidation', () => {
  it('accepts a valid create payload and strips status', () => {
    const { error, value } = createAuctionSchema.validate(
      { ...validCreate, status: 'active', createdBy: 'someone' },
      { abortEarly: false, stripUnknown: true },
    )

    assert.equal(error, undefined)
    assert.equal(value.startingPrice, 0)
    assert.equal(Object.prototype.hasOwnProperty.call(value, 'status'), false)
    assert.equal(
      Object.prototype.hasOwnProperty.call(value, 'createdBy'),
      false,
    )
  })

  it('rejects a negative starting price', () => {
    const { error } = createAuctionSchema.validate({
      ...validCreate,
      startingPrice: -1,
    })
    assert.ok(error)
  })

  it('rejects a missing title', () => {
    const { error } = createAuctionSchema.validate({
      whiskyId: 'macallan-18',
      startingPrice: 10,
      startAt: validCreate.startAt,
      endAt: validCreate.endAt,
    })
    assert.ok(error)
  })

  it('rejects an empty update body', () => {
    const { error } = updateAuctionSchema.validate({})
    assert.ok(error)
  })

  it('accepts a partial draft update', () => {
    const { error, value } = updateAuctionSchema.validate(
      { title: 'Updated title', status: 'active' },
      { abortEarly: false, stripUnknown: true },
    )
    assert.equal(error, undefined)
    assert.equal(value.title, 'Updated title')
    assert.equal(Object.prototype.hasOwnProperty.call(value, 'status'), false)
  })

  it('rejects an invalid auction id', () => {
    const { error } = auctionIdParamsSchema.validate({ id: 'not-an-id' })
    assert.ok(error)
  })

  it('rejects a create payload whose endAt is not after startAt', () => {
    for (const endAt of [validCreate.startAt, '2026-10-09T00:00:00.000Z']) {
      const { error } = createAuctionSchema.validate({ ...validCreate, endAt })
      assert.ok(error)
      assert.ok(
        error.details.some(
          (detail) => detail.message === 'End time must be after start time',
        ),
      )
    }
  })

  it('rejects an update with both dates when endAt is not after startAt', () => {
    const { error } = updateAuctionSchema.validate({
      startAt: validCreate.startAt,
      endAt: validCreate.startAt,
    })
    assert.ok(error)
  })

  it('accepts an update with only one of the dates', () => {
    assert.equal(
      updateAuctionSchema.validate({ endAt: validCreate.endAt }).error,
      undefined,
    )
    assert.equal(
      updateAuctionSchema.validate({ startAt: validCreate.startAt }).error,
      undefined,
    )
  })

  it('requires a trimmed, non-empty cancel message', () => {
    const { error, value } = cancelAuctionSchema.validate(
      { message: '  Seller withdrew  ', status: 'active' },
      { stripUnknown: true },
    )
    assert.equal(error, undefined)
    assert.deepEqual(value, { message: 'Seller withdrew' })

    assert.ok(cancelAuctionSchema.validate({}).error)
    assert.ok(cancelAuctionSchema.validate({ message: '   ' }).error)
    assert.ok(cancelAuctionSchema.validate({ message: 'x'.repeat(501) }).error)
  })
})
