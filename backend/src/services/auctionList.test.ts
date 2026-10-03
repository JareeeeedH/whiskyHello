/**
 * Public auction list API tests.
 * Skips MongoDB cases when the database is unreachable.
 * The database is shared, so assertions only look at auctions created here,
 * except for the empty-list case which skips if other public auctions exist.
 */
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import mongoose from 'mongoose'
import app from '../app'
import { Auction } from '../models/Auction'
import type { AuctionStatus } from '../types/auction'
import { listPublicAuctions } from './auctionService'

const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/whiskyhello_test'

const DAY_MS = 24 * 60 * 60 * 1000

let mongoReady = false
let server: http.Server | null = null
let baseUrl = ''
const createdAuctionIds: string[] = []

type ListResponse = {
  auctions: Array<Record<string, unknown>>
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

async function createAuction(status: AuctionStatus, endAt: Date): Promise<string> {
  const auction = await Auction.create({
    whiskyId: 'qa-auction-list',
    createdBy: new mongoose.Types.ObjectId(),
    title: `QA List ${status}`,
    description: 'Public list test',
    startingPrice: 300,
    startAt: new Date(endAt.getTime() - DAY_MS),
    endAt,
    status,
  })
  createdAuctionIds.push(auction.id)
  return auction.id
}

async function fetchList(): Promise<{ status: number; body: ListResponse }> {
  const res = await fetch(`${baseUrl}/api/v1/auctions`)
  return { status: res.status, body: (await res.json()) as ListResponse }
}

describe('GET /api/v1/auctions', () => {
  it('lists only open active auctions without logging in', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const future = new Date(Date.now() + DAY_MS)
    const past = new Date(Date.now() - 60_000)
    const activeId = await createAuction('active', future)
    const hiddenIds = [
      await createAuction('draft', future),
      await createAuction('scheduled', future),
      await createAuction('ended', future),
      await createAuction('cancelled', future),
      await createAuction('active', past),
    ]

    const { status, body } = await fetchList()
    assert.equal(status, 200)

    const ids = body.auctions.map((auction) => auction.id)
    assert.ok(ids.includes(activeId))
    for (const hiddenId of hiddenIds) {
      assert.ok(!ids.includes(hiddenId), `unexpected auction ${hiddenId}`)
    }
    for (const auction of body.auctions) {
      assert.equal(auction.status, 'active')
      assert.ok(new Date(String(auction.endAt)).getTime() > Date.now() - 5000)
    }
  })

  it('returns public fields without createdBy', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const id = await createAuction('active', new Date(Date.now() + DAY_MS))
    const { body } = await fetchList()
    const auction = body.auctions.find((item) => item.id === id)
    assert.ok(auction)
    assert.deepEqual(Object.keys(auction).sort(), [
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
    assert.equal(auction.whiskyId, 'qa-auction-list')
    assert.equal(auction.description, 'Public list test')
    assert.equal(auction.startingPrice, 300)
    for (const item of body.auctions) {
      assert.ok(!('createdBy' in item))
    }
  })

  it('sorts by endAt, soonest first', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const now = Date.now()
    const later = await createAuction('active', new Date(now + 3 * DAY_MS))
    const soonest = await createAuction('active', new Date(now + DAY_MS))
    const middle = await createAuction('active', new Date(now + 2 * DAY_MS))

    const { body } = await fetchList()
    const ids = body.auctions.map((auction) => String(auction.id))
    const ours = ids.filter((id) => [later, soonest, middle].includes(id))
    assert.deepEqual(ours, [soonest, middle, later])

    const endTimes = body.auctions.map((auction) =>
      new Date(String(auction.endAt)).getTime(),
    )
    assert.deepEqual(endTimes, [...endTimes].sort((a, b) => a - b))
  })

  it('returns an empty list when no auction is open', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    assert.deepEqual(await listPublicAuctions(new Date('9999-12-31T00:00:00.000Z')), [])

    await Auction.deleteMany({ _id: { $in: createdAuctionIds } })
    const { status, body } = await fetchList()
    assert.equal(status, 200)
    if (body.auctions.length > 0) {
      t.skip('Other open auctions exist in the shared database')
      return
    }
    assert.deepEqual(body, { auctions: [] })
  })
})
