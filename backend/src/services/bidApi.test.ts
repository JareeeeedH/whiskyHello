/**
 * Auction bid API tests.
 * Requires TEST_MONGODB_URI (dedicated test database).
 */
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it, mock } from 'node:test'
import mongoose from 'mongoose'
import app from '../app'
import { Auction } from '../models/Auction'
import { Bid } from '../models/Bid'
import { User } from '../models/User'
import { DUPLICATE_BID_AMOUNT_MESSAGE } from './bidService'
import {
  connectTestDatabase,
  disconnectTestDatabase,
} from '../test/testDatabase'
import { signAccessToken } from '../utils/jwt'
import { hashPassword } from '../utils/password'

const DAY_MS = 24 * 60 * 60 * 1000

let server: http.Server | null = null
let baseUrl = ''
const createdUserIds: string[] = []
const createdAuctionIds: string[] = []

type AuctionStatus = 'draft' | 'scheduled' | 'active' | 'ended' | 'cancelled'

type BidResponse = {
  bid: Record<string, unknown>
  currentPrice: number
  endAt: string
}

type HistoryResponse = {
  bids: Array<Record<string, unknown>>
  currentPrice: number
}

before(async () => {
  await connectTestDatabase()
  await Bid.init()

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
  if (mongoose.connection.readyState === 1) {
    if (createdAuctionIds.length > 0) {
      await Bid.deleteMany({ auctionId: { $in: createdAuctionIds } })
      await Auction.deleteMany({ _id: { $in: createdAuctionIds } })
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } })
    }
    await disconnectTestDatabase()
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

  it('rejects bids on non-active auctions', async () => {
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

  it('rejects bids once endAt has passed', async () => {
    const { token } = await createUser()
    const auctionId = await createAuction('active', new Date(Date.now() - 1000))
    const res = await postBid(auctionId, 1000, token)
    assert.equal(res.status, 400)
    assert.deepEqual(await res.json(), { message: 'Auction has ended' })
  })

  it('enforces startingPrice for the first bid and +100 afterwards', async () => {
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

  it('extends endAt to bid time + 2 minutes when bidding in the last minute', async () => {
    const bidder = await createUser()
    const auctionId = await createAuction('active', new Date(Date.now() + 30 * 1000))

    const before = Date.now()
    const res = await postBid(auctionId, 1000, bidder.token)
    const after = Date.now()
    assert.equal(res.status, 201)
    const body = (await res.json()) as BidResponse

    const endAt = new Date(body.endAt).getTime()
    assert.ok(endAt >= before + 2 * 60 * 1000 && endAt <= after + 2 * 60 * 1000)
    const stored = await Auction.findById(auctionId)
    assert.equal(stored?.endAt.getTime(), endAt)
  })

  it('keeps endAt unchanged when bidding before the last minute', async () => {
    const bidder = await createUser()
    const originalEndAt = new Date(Date.now() + 2 * 60 * 1000)
    const auctionId = await createAuction('active', originalEndAt)

    const res = await postBid(auctionId, 1000, bidder.token)
    assert.equal(res.status, 201)
    const body = (await res.json()) as BidResponse
    assert.equal(new Date(body.endAt).getTime(), originalEndAt.getTime())

    const stored = await Auction.findById(auctionId)
    assert.equal(stored?.endAt.getTime(), originalEndAt.getTime())
  })

  it('rejects a non-integer amount', async () => {
    const { token } = await createUser()
    const auctionId = await createAuction('active')
    const res = await postBid(auctionId, 1000.5, token)
    assert.equal(res.status, 400)
    const body = (await res.json()) as { message: string; details: string[] }
    assert.equal(body.message, 'Validation failed')
    assert.ok(body.details.includes('Amount must be an integer'))
  })

  it('returns 404 for a missing auction and 400 for an invalid id', async () => {
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

describe('Bid unique (auctionId, amount)', () => {
  function isDuplicateKeyError(error: unknown): boolean {
    assert.equal((error as { code?: number }).code, 11000)
    return true
  }

  it('rejects a second bid with the same amount on the same auction', async () => {
    const bidder = await createUser()
    const auctionId = await createAuction('active')
    await Bid.create({ auctionId, userId: bidder.id, amount: 1100 })

    await assert.rejects(
      Bid.create({ auctionId, userId: bidder.id, amount: 1100 }),
      isDuplicateKeyError,
    )
    assert.equal(await Bid.countDocuments({ auctionId }), 1)
  })

  it('allows the same amount on different auctions', async () => {
    const bidder = await createUser()
    const firstAuctionId = await createAuction('active')
    const secondAuctionId = await createAuction('active')

    await Bid.create({ auctionId: firstAuctionId, userId: bidder.id, amount: 1100 })
    await Bid.create({ auctionId: secondAuctionId, userId: bidder.id, amount: 1100 })

    assert.equal(await Bid.countDocuments({ auctionId: firstAuctionId }), 1)
    assert.equal(await Bid.countDocuments({ auctionId: secondAuctionId }), 1)
  })

  it('allows different amounts on the same auction', async () => {
    const bidder = await createUser()
    const auctionId = await createAuction('active')

    await Bid.create({ auctionId, userId: bidder.id, amount: 1100 })
    await Bid.create({ auctionId, userId: bidder.id, amount: 1200 })

    assert.equal(await Bid.countDocuments({ auctionId }), 2)
  })

  it('maps a duplicate key error to 400 with a friendly message', async () => {
    const first = await createUser()
    const second = await createUser()
    const auctionId = await createAuction('active')
    await Bid.create({ auctionId, userId: first.id, amount: 1000 })

    const findOne = mock.method(Bid, 'findOne', () => ({ sort: async () => null }))
    try {
      const res = await postBid(auctionId, 1000, second.token)
      assert.equal(res.status, 400)
      assert.deepEqual(await res.json(), { message: DUPLICATE_BID_AMOUNT_MESSAGE })
    } finally {
      findOne.mock.restore()
    }

    assert.equal(await Bid.countDocuments({ auctionId }), 1)
  })

  it('lets only one of two simultaneous same-amount bids succeed', async () => {
    const first = await createUser()
    const second = await createUser()
    const auctionId = await createAuction('active')

    const responses = await Promise.all([
      postBid(auctionId, 1000, first.token),
      postBid(auctionId, 1000, second.token),
    ])
    const statuses = responses.map((res) => res.status).sort()
    assert.deepEqual(statuses, [201, 400])

    const rejected = responses.find((res) => res.status === 400)!
    const body = (await rejected.json()) as { message: string }
    assert.ok(
      [DUPLICATE_BID_AMOUNT_MESSAGE, 'Bid amount must be at least 1100'].includes(body.message),
      body.message,
    )
    assert.equal(await Bid.countDocuments({ auctionId }), 1)
  })
})

describe('GET /api/v1/auctions/:id/bids', () => {
  it('returns currentPrice = startingPrice when there are no bids', async () => {
    const auctionId = await createAuction('active')
    const res = await fetch(`${baseUrl}/api/v1/auctions/${auctionId}/bids`)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { bids: [], currentPrice: 1000 })
  })

  it('returns bid history newest first without logging in', async () => {
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

  it('returns currentPrice = startingPrice for a scheduled auction', async () => {
    const auctionId = await createAuction('scheduled')
    const res = await fetch(`${baseUrl}/api/v1/auctions/${auctionId}/bids`)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { bids: [], currentPrice: 1000 })
  })

  it('returns history for non-draft auctions in other statuses', async () => {
    const auctionId = await createAuction('ended')
    const res = await fetch(`${baseUrl}/api/v1/auctions/${auctionId}/bids`)
    assert.equal(res.status, 200)
  })

  it('returns 404 for a draft or missing auction', async () => {
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
