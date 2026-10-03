/**
 * Auction auto close tests.
 * Requires TEST_MONGODB_URI (dedicated test database).
 */
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import mongoose from 'mongoose'
import { runAuctionAutoClose } from '../jobs/auctionAutoClose'
import { Auction } from '../models/Auction'
import {
  connectTestDatabase,
  disconnectTestDatabase,
} from '../test/testDatabase'
import type { AuctionStatus } from '../types/auction'
import {
  activateScheduledAuctions,
  closeExpiredAuctions,
} from './auctionService'

const DAY_MS = 24 * 60 * 60 * 1000

const createdAuctionIds: string[] = []

before(async () => {
  await connectTestDatabase()
})

after(async () => {
  if (mongoose.connection.readyState === 1) {
    if (createdAuctionIds.length > 0) {
      await Auction.deleteMany({ _id: { $in: createdAuctionIds } })
    }
    await disconnectTestDatabase()
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
  it('keeps an active auction active before endAt', async () => {
    const now = new Date()
    const id = await createAuction('active', new Date(now.getTime() + DAY_MS))
    await closeExpiredAuctions(now)
    assert.equal(await statusOf(id), 'active')
  })

  it('ends an active auction when now equals endAt', async () => {
    const now = new Date()
    const id = await createAuction('active', now)
    const closed = await closeExpiredAuctions(now)
    assert.ok(closed >= 1)
    assert.equal(await statusOf(id), 'ended')
  })

  it('ends an active auction after endAt', async () => {
    const now = new Date()
    const id = await createAuction('active', new Date(now.getTime() - 60_000))
    await closeExpiredAuctions(now)
    assert.equal(await statusOf(id), 'ended')
  })

  it('does not reprocess an ended auction', async () => {
    const now = new Date()
    const id = await createAuction('ended', new Date(now.getTime() - 60_000))
    const original = await Auction.findById(id)

    await closeExpiredAuctions(now)

    const reloaded = await Auction.findById(id)
    assert.equal(reloaded?.status, 'ended')
    assert.equal(reloaded?.updatedAt.getTime(), original?.updatedAt.getTime())
  })

  it('ignores draft, scheduled and cancelled auctions past endAt', async () => {
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

async function createScheduled(startAt: Date, endAt: Date): Promise<string> {
  const auction = await Auction.create({
    whiskyId: 'qa-auto-close',
    createdBy: new mongoose.Types.ObjectId(),
    title: 'QA Lifecycle scheduled',
    startingPrice: 100,
    startAt,
    endAt,
    status: 'scheduled',
  })
  createdAuctionIds.push(auction.id)
  return auction.id
}

describe('activateScheduledAuctions', () => {
  it('keeps a scheduled auction scheduled before startAt', async () => {
    const now = new Date()
    const id = await createScheduled(
      new Date(now.getTime() + 60_000),
      new Date(now.getTime() + DAY_MS),
    )
    await activateScheduledAuctions(now)
    assert.equal(await statusOf(id), 'scheduled')
  })

  it('activates a scheduled auction when now equals startAt', async () => {
    const now = new Date()
    const id = await createScheduled(now, new Date(now.getTime() + DAY_MS))
    const activated = await activateScheduledAuctions(now)
    assert.ok(activated >= 1)
    assert.equal(await statusOf(id), 'active')
  })

  it('activates a scheduled auction after startAt', async () => {
    const now = new Date()
    const id = await createScheduled(
      new Date(now.getTime() - 60_000),
      new Date(now.getTime() + DAY_MS),
    )
    await activateScheduledAuctions(now)
    assert.equal(await statusOf(id), 'active')
  })

  it('ignores draft, active, ended and cancelled auctions past startAt', async () => {
    const now = new Date()
    const futureEndAt = new Date(now.getTime() + DAY_MS)
    const ids = {
      draft: await createAuction('draft', futureEndAt),
      active: await createAuction('active', futureEndAt),
      ended: await createAuction('ended', futureEndAt),
      cancelled: await createAuction('cancelled', futureEndAt),
    }

    await activateScheduledAuctions(now)

    for (const [status, id] of Object.entries(ids)) {
      assert.equal(await statusOf(id), status)
    }
  })
})

describe('runAuctionAutoClose', () => {
  it('ends expired active auctions in MongoDB', async () => {
    const id = await createAuction('active', new Date(Date.now() - 1000))
    await runAuctionAutoClose()
    assert.equal(await statusOf(id), 'ended')
  })

  it('activates scheduled auctions whose startAt has been reached', async () => {
    const now = Date.now()
    const id = await createScheduled(
      new Date(now - 1000),
      new Date(now + DAY_MS),
    )
    await runAuctionAutoClose()
    assert.equal(await statusOf(id), 'active')
  })

  it('does not transition scheduled or active auctions early', async () => {
    const now = Date.now()
    const scheduledId = await createScheduled(
      new Date(now + 60_000),
      new Date(now + DAY_MS),
    )
    const activeId = await createAuction('active', new Date(now + 60_000))

    await runAuctionAutoClose()

    assert.equal(await statusOf(scheduledId), 'scheduled')
    assert.equal(await statusOf(activeId), 'active')
  })

  it('moves a scheduled auction past both startAt and endAt to ended in one run', async () => {
    const now = Date.now()
    const id = await createScheduled(
      new Date(now - 2 * DAY_MS),
      new Date(now - 1000),
    )
    await runAuctionAutoClose()
    assert.equal(await statusOf(id), 'ended')
  })
})
