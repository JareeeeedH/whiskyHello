import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import mongoose from 'mongoose'
import { Auction } from './Auction'

const createdBy = new mongoose.Types.ObjectId()

function validInput() {
  return {
    whiskyId: 'macallan-18',
    createdBy,
    title: 'Macallan 18',
    startingPrice: 0,
    startAt: new Date('2026-10-10T00:00:00.000Z'),
    endAt: new Date('2026-10-12T00:00:00.000Z'),
    status: 'draft' as const,
  }
}

async function validationPaths(
  input: Record<string, unknown>,
): Promise<string[]> {
  const doc = new Auction(input)
  try {
    await doc.validate()
    return []
  } catch (error) {
    assert.ok(error instanceof mongoose.Error.ValidationError)
    return Object.keys(error.errors).sort()
  }
}

describe('Auction model', () => {
  it('stores timestamps and the static whisky id as a string', () => {
    assert.equal(Auction.schema.options.timestamps, true)
    assert.equal(Auction.schema.path('whiskyId').instance, 'String')
    assert.equal(Auction.schema.path('createdBy').instance, 'ObjectId')
    assert.equal(Auction.schema.path('createdBy').options.ref, 'User')
  })

  it('accepts a valid auction without a description', async () => {
    const doc = new Auction(validInput())
    await doc.validate()
    assert.equal(doc.title, 'Macallan 18')
    assert.equal(doc.description, undefined)
    assert.equal(doc.startingPrice, 0)
  })

  it('accepts every status', async () => {
    for (const status of [
      'draft',
      'scheduled',
      'active',
      'ended',
      'cancelled',
    ] as const) {
      const doc = new Auction({ ...validInput(), status })
      await doc.validate()
      assert.equal(doc.status, status)
    }
  })

  it('requires the persisted fields', async () => {
    assert.deepEqual(await validationPaths({}), [
      'createdBy',
      'endAt',
      'startAt',
      'startingPrice',
      'status',
      'title',
      'whiskyId',
    ])
  })

  it('rejects a negative starting price and an unknown status', async () => {
    assert.deepEqual(
      await validationPaths({
        ...validInput(),
        startingPrice: -1,
        status: 'live',
      }),
      ['startingPrice', 'status'],
    )
  })
})
