/**
 * Auction auto close tests.
 * Skips MongoDB cases when the database is unreachable.
 * `now` is always the real current time so other auctions in the database
 * are never closed before their endAt.
 */
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import mongoose from 'mongoose'
import { runAuctionAutoClose } from '../jobs/auctionAutoClose'
import { Auction } from '../models/Auction'
import type { AuctionStatus } from '../types/auction'
import { closeExpiredAuctions } from './auctionService'

const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/whiskyhello_test'

const DAY_MS = 24 * 60 * 60 * 1000

let mongoReady = false
const createdAuctionIds: string[] = []

before(async () => {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 })
    mongoReady = true
  } catch {
    mongoReady = false
  }
})

after(async () => {
  if (mongoReady) {
    if (createdAuctionIds.length > 0) {
      await Auction.deleteMany({ _id: { $in: createdAuctionIds } })
    }
    await mongoose.disconnect()
  }
})

async function createAuction(status: AuctionStatus, endAt: Date): Promise<string> {
  const auction = await Auction.create({
    whiskyId: 'qa-auto-close',
    createdBy: new mongoose.Types.ObjectId(),
    title: `QA Auto Close ${status}`,
    startingPrice: 100,
    startAt: new Date(endAt.getTime() - DAY_MS),
    endAt,
    status,
  })
  createdAuctionIds.push(auction.id)
  return auction.id
}

async function statusOf(id: string): Promise<string | undefined> {
  const auction = await Auction.findById(id)
  return auction?.status
}

describe('closeExpiredAuctions', () => {
  it('keeps an active auction active before endAt', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const now = new Date()
    const id = await createAuction('active', new Date(now.getTime() + DAY_MS))
    await closeExpiredAuctions(now)
    assert.equal(await statusOf(id), 'active')
  })

  it('ends an active auction when now equals endAt', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const now = new Date()
    const id = await createAuction('active', now)
    const closed = await closeExpiredAuctions(now)
    assert.ok(closed >= 1)
    assert.equal(await statusOf(id), 'ended')
  })

  it('ends an active auction after endAt', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const now = new Date()
    const id = await createAuction('active', new Date(now.getTime() - 60_000))
    await closeExpiredAuctions(now)
    assert.equal(await statusOf(id), 'ended')
  })

  it('does not reprocess an ended auction', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const now = new Date()
    const id = await createAuction('ended', new Date(now.getTime() - 60_000))
    const original = await Auction.findById(id)

    await closeExpiredAuctions(now)

    const reloaded = await Auction.findById(id)
    assert.equal(reloaded?.status, 'ended')
    assert.equal(reloaded?.updatedAt.getTime(), original?.updatedAt.getTime())
  })

  it('ignores draft, scheduled and cancelled auctions past endAt', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const now = new Date()
    const pastEndAt = new Date(now.getTime() - 60_000)
    const ids = {
      draft: await createAuction('draft', pastEndAt),
      scheduled: await createAuction('scheduled', pastEndAt),
      cancelled: await createAuction('cancelled', pastEndAt),
    }

    await closeExpiredAuctions(now)

    for (const [status, id] of Object.entries(ids)) {
      assert.equal(await statusOf(id), status)
    }
  })
})

describe('runAuctionAutoClose', () => {
  it('ends expired active auctions in MongoDB', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const id = await createAuction('active', new Date(Date.now() - 1000))
    await runAuctionAutoClose()
    assert.equal(await statusOf(id), 'ended')
  })
})
