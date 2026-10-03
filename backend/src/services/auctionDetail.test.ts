/**
 * Public auction detail API tests.
 * Skips MongoDB cases when the database is unreachable.
 */
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import mongoose from 'mongoose'
import app from '../app'
import { Auction } from '../models/Auction'

const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/whiskyhello_test'

let mongoReady = false
let server: http.Server | null = null
let baseUrl = ''
const createdAuctionIds: string[] = []

async function createAuction(status: 'draft' | 'active' | 'ended') {
  const auction = await Auction.create({
    whiskyId: 'qa-auction-detail',
    createdBy: new mongoose.Types.ObjectId(),
    title: `QA Detail ${status}`,
    description: 'Public detail test',
    startingPrice: 200,
    startAt: new Date('2026-10-10T00:00:00.000Z'),
    endAt: new Date('2026-10-12T00:00:00.000Z'),
    status,
  })
  createdAuctionIds.push(auction.id)
  return auction
}

before(async () => {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 })
    mongoReady = true
  } catch {
    mongoReady = false
  }

  server = http.createServer(app)
  await new Promise<void>((resolve) => {
    server!.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => (err ? reject(err) : resolve()))
    })
  }
  if (mongoReady) {
    if (createdAuctionIds.length > 0) {
      await Auction.deleteMany({ _id: { $in: createdAuctionIds } })
    }
    await mongoose.disconnect()
  }
})

describe('GET /api/v1/auctions/:id', () => {
  it('returns an active auction without logging in', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const auction = await createAuction('active')
    const res = await fetch(`${baseUrl}/api/v1/auctions/${auction.id}`)
    assert.equal(res.status, 200)

    const body = (await res.json()) as { auction: Record<string, unknown> }
    assert.deepEqual(Object.keys(body.auction).sort(), [
      'createdAt',
      'description',
      'endAt',
      'id',
      'startAt',
      'startingPrice',
      'status',
      'title',
      'updatedAt',
      'whiskyId',
    ])
    assert.equal(body.auction.id, auction.id)
    assert.equal(body.auction.whiskyId, 'qa-auction-detail')
    assert.equal(body.auction.title, 'QA Detail active')
    assert.equal(body.auction.description, 'Public detail test')
    assert.equal(body.auction.startingPrice, 200)
    assert.equal(body.auction.startAt, '2026-10-10T00:00:00.000Z')
    assert.equal(body.auction.endAt, '2026-10-12T00:00:00.000Z')
    assert.equal(body.auction.status, 'active')
  })

  it('returns a non-draft auction in another status', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const auction = await createAuction('ended')
    const res = await fetch(`${baseUrl}/api/v1/auctions/${auction.id}`)
    assert.equal(res.status, 200)
    const body = (await res.json()) as { auction: { status: string } }
    assert.equal(body.auction.status, 'ended')
  })

  it('returns 404 for a draft auction', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const auction = await createAuction('draft')
    const res = await fetch(`${baseUrl}/api/v1/auctions/${auction.id}`)
    assert.equal(res.status, 404)
    assert.deepEqual(await res.json(), { message: 'Auction not found' })
  })

  it('returns 404 when the auction does not exist', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const missingId = new mongoose.Types.ObjectId().toString()
    const res = await fetch(`${baseUrl}/api/v1/auctions/${missingId}`)
    assert.equal(res.status, 404)
    assert.deepEqual(await res.json(), { message: 'Auction not found' })
  })

  it('returns 400 for an invalid id', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auctions/not-an-id`)
    assert.equal(res.status, 400)
    const body = (await res.json()) as { message: string; details: string[] }
    assert.equal(body.message, 'Validation failed')
    assert.ok(body.details.includes('Auction id must be a valid id'))
  })
})
