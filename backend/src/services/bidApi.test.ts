/**
 * Auction bid API tests.
 * Skips MongoDB cases when the database is unreachable.
 */
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import mongoose from 'mongoose'
import app from '../app'
import { Auction } from '../models/Auction'
import { Bid } from '../models/Bid'
import { User } from '../models/User'
import { signAccessToken } from '../utils/jwt'
import { hashPassword } from '../utils/password'

const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/whiskyhello_test'

const DAY_MS = 24 * 60 * 60 * 1000

let mongoReady = false
let server: http.Server | null = null
let baseUrl = ''
const createdUserIds: string[] = []
const createdAuctionIds: string[] = []

type AuctionStatus = 'draft' | 'scheduled' | 'active' | 'ended' | 'cancelled'

type BidResponse = {
  bid: Record<string, unknown>
  currentPrice: number
}

type HistoryResponse = {
  bids: Array<Record<string, unknown>>
  currentPrice: number
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
      await Bid.deleteMany({ auctionId: { $in: createdAuctionIds } })
      await Auction.deleteMany({ _id: { $in: createdAuctionIds } })
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } })
    }
    await mongoose.disconnect()
  }
})

async function createUser(): Promise<{ id: string; token: string }> {
  const user = await User.create({
    name: 'QA Bidder',
    email: `qa-bidder-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    passwordHash: await hashPassword('password12345'),
    role: 'user',
  })
  createdUserIds.push(user.id)
  return { id: user.id, token: signAccessToken({ userId: user.id }) }
}

async function createAuction(
  status: AuctionStatus,
  endAt = new Date(Date.now() + DAY_MS),
): Promise<string> {
  const auction = await Auction.create({
    whiskyId: 'qa-bid-whisky',
    createdBy: new mongoose.Types.ObjectId(),
    title: `QA Bid ${status}`,
    startingPrice: 1000,
    startAt: new Date(Date.now() - DAY_MS),
    endAt,
    status,
  })
  createdAuctionIds.push(auction.id)
  return auction.id
}

function postBid(auctionId: string, amount: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return fetch(`${baseUrl}/api/v1/auctions/${auctionId}/bids`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amount }),
  })
}

describe('POST /api/v1/auctions/:id/bids', () => {
  it('returns 401 without a token', async () => {
    const auctionId = new mongoose.Types.ObjectId().toString()
    const res = await postBid(auctionId, 1000)
    assert.equal(res.status, 401)
  })

  it('rejects bids on non-active auctions', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const { token } = await createUser()

    for (const status of ['scheduled', 'ended', 'cancelled'] as const) {
      const auctionId = await createAuction(status)
      const res = await postBid(auctionId, 1000, token)
      assert.equal(res.status, 400, status)
      assert.deepEqual(await res.json(), {
        message: 'Only active auctions accept bids',
      })
    }

    const draftId = await createAuction('draft')
    const draftRes = await postBid(draftId, 1000, token)
    assert.equal(draftRes.status, 404)
    assert.deepEqual(await draftRes.json(), { message: 'Auction not found' })
  })

  it('rejects bids once endAt has passed', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const { token } = await createUser()
    const auctionId = await createAuction('active', new Date(Date.now() - 1000))
    const res = await postBid(auctionId, 1000, token)
    assert.equal(res.status, 400)
    assert.deepEqual(await res.json(), { message: 'Auction has ended' })
  })

  it('enforces startingPrice for the first bid and +100 afterwards', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const bidder = await createUser()
    const auctionId = await createAuction('active')

    const tooLow = await postBid(auctionId, 999, bidder.token)
    assert.equal(tooLow.status, 400)
    assert.deepEqual(await tooLow.json(), {
      message: 'Bid amount must be at least 1000',
    })

    const first = await postBid(auctionId, 1000, bidder.token)
    assert.equal(first.status, 201)
    const firstBody = (await first.json()) as BidResponse
    assert.equal(firstBody.currentPrice, 1000)
    assert.deepEqual(Object.keys(firstBody.bid).sort(), [
      'amount',
      'auctionId',
      'bidderName',
      'createdAt',
      'id',
      'updatedAt',
      'userId',
    ])
    assert.equal(firstBody.bid.amount, 1000)
    assert.equal(firstBody.bid.auctionId, auctionId)
    assert.equal(firstBody.bid.userId, bidder.id)
    assert.equal(firstBody.bid.bidderName, 'QA Bidder')

    const samePrice = await postBid(auctionId, 1000, bidder.token)
    assert.equal(samePrice.status, 400)

    const belowIncrement = await postBid(auctionId, 1099, bidder.token)
    assert.equal(belowIncrement.status, 400)
    assert.deepEqual(await belowIncrement.json(), {
      message: 'Bid amount must be at least 1100',
    })

    const second = await postBid(auctionId, 1100, bidder.token)
    assert.equal(second.status, 201)
    const secondBody = (await second.json()) as BidResponse
    assert.equal(secondBody.currentPrice, 1100)

    assert.equal(await Bid.countDocuments({ auctionId }), 2)
  })

  it('rejects a non-integer amount', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const { token } = await createUser()
    const auctionId = await createAuction('active')
    const res = await postBid(auctionId, 1000.5, token)
    assert.equal(res.status, 400)
    const body = (await res.json()) as { message: string; details: string[] }
    assert.equal(body.message, 'Validation failed')
    assert.ok(body.details.includes('Amount must be an integer'))
  })

  it('returns 404 for a missing auction and 400 for an invalid id', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const { token } = await createUser()
    const missingId = new mongoose.Types.ObjectId().toString()
    const missing = await postBid(missingId, 1000, token)
    assert.equal(missing.status, 404)
    assert.deepEqual(await missing.json(), { message: 'Auction not found' })

    const invalid = await postBid('not-an-id', 1000, token)
    assert.equal(invalid.status, 400)
    const body = (await invalid.json()) as { message: string; details: string[] }
    assert.ok(body.details.includes('Auction id must be a valid id'))
  })
})

describe('GET /api/v1/auctions/:id/bids', () => {
  it('returns currentPrice = startingPrice when there are no bids', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const auctionId = await createAuction('active')
    const res = await fetch(`${baseUrl}/api/v1/auctions/${auctionId}/bids`)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { bids: [], currentPrice: 1000 })
  })

  it('returns bid history newest first without logging in', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const bidder = await createUser()
    const auctionId = await createAuction('active')
    for (const amount of [1000, 1100, 1250]) {
      const res = await postBid(auctionId, amount, bidder.token)
      assert.equal(res.status, 201)
    }

    const res = await fetch(`${baseUrl}/api/v1/auctions/${auctionId}/bids`)
    assert.equal(res.status, 200)
    const body = (await res.json()) as HistoryResponse
    assert.equal(body.currentPrice, 1250)
    assert.deepEqual(
      body.bids.map((bid) => bid.amount),
      [1250, 1100, 1000],
    )
    for (const bid of body.bids) {
      assert.deepEqual(Object.keys(bid).sort(), [
        'amount',
        'auctionId',
        'bidderName',
        'createdAt',
        'id',
        'updatedAt',
        'userId',
      ])
    }
  })

  it('returns history for non-draft auctions in other statuses', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const auctionId = await createAuction('ended')
    const res = await fetch(`${baseUrl}/api/v1/auctions/${auctionId}/bids`)
    assert.equal(res.status, 200)
  })

  it('returns 404 for a draft or missing auction', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const draftId = await createAuction('draft')
    const draft = await fetch(`${baseUrl}/api/v1/auctions/${draftId}/bids`)
    assert.equal(draft.status, 404)
    assert.deepEqual(await draft.json(), { message: 'Auction not found' })

    const missingId = new mongoose.Types.ObjectId().toString()
    const missing = await fetch(`${baseUrl}/api/v1/auctions/${missingId}/bids`)
    assert.equal(missing.status, 404)
  })

  it('returns 400 for an invalid id', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auctions/not-an-id/bids`)
    assert.equal(res.status, 400)
    const body = (await res.json()) as { message: string; details: string[] }
    assert.equal(body.message, 'Validation failed')
    assert.ok(body.details.includes('Auction id must be a valid id'))
  })
})
