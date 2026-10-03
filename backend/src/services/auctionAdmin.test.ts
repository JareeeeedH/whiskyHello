/**
 * Admin auction API tests.
 * Requires TEST_MONGODB_URI (dedicated test database).
 */
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import mongoose from 'mongoose'
import app from '../app'
import { Auction } from '../models/Auction'
import { User } from '../models/User'
import {
  connectTestDatabase,
  disconnectTestDatabase,
} from '../test/testDatabase'
import { signAccessToken } from '../utils/jwt'
import { hashPassword } from '../utils/password'

let server: http.Server | null = null
let baseUrl = ''
const createdUserIds: string[] = []
const createdAuctionIds: string[] = []

const DAY_MS = 24 * 60 * 60 * 1000

const createBody = {
  whiskyId: 'qa-auction-whisky',
  title: 'QA Auction',
  description: 'Draft bottle',
  startingPrice: 120,
  startAt: new Date(Date.now() + DAY_MS).toISOString(),
  endAt: new Date(Date.now() + 3 * DAY_MS).toISOString(),
}

async function startServer(): Promise<void> {
  server = http.createServer(app)
  await new Promise<void>((resolve) => {
    server!.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
}

before(async () => {
  await connectTestDatabase()
  await startServer()
})

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => (err ? reject(err) : resolve()))
    })
  }
  if (mongoose.connection.readyState === 1) {
    if (createdAuctionIds.length > 0) {
      await Auction.deleteMany({ _id: { $in: createdAuctionIds } })
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } })
    }
    await disconnectTestDatabase()
  }
})

async function createUser(role: 'admin' | 'user'): Promise<string> {
  const user = await User.create({
    name: `QA Auction ${role}`,
    email: `qa-auction-${role}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    passwordHash: await hashPassword('password12345'),
    role,
  })
  createdUserIds.push(user.id)
  return user.id
}

describe('Admin auction API', () => {
  it('POST /api/v1/admin/auctions → 401 without a token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/auctions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody),
    })
    assert.equal(res.status, 401)
  })

  it('GET /api/v1/admin/auctions → 401 without a token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/auctions`)
    assert.equal(res.status, 401)
  })

  it('POST /api/v1/admin/auctions → 403 for a non-admin', async () => {
    const userId = await createUser('user')
    const res = await fetch(`${baseUrl}/api/v1/admin/auctions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${signAccessToken({ userId })}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBody),
    })
    assert.equal(res.status, 403)
  })

  it('creates a draft, edits it, and starts it', async () => {
    const adminId = await createUser('admin')
    const headers = {
      Authorization: `Bearer ${signAccessToken({ userId: adminId })}`,
      'Content-Type': 'application/json',
    }

    const created = await fetch(`${baseUrl}/api/v1/admin/auctions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...createBody, status: 'active' }),
    })
    assert.equal(created.status, 201)
    const createdBody = (await created.json()) as {
      auction: Record<string, unknown>
    }
    const auctionId = String(createdBody.auction.id)
    createdAuctionIds.push(auctionId)
    assert.equal(createdBody.auction.status, 'draft')
    assert.equal(createdBody.auction.createdBy, adminId)
    assert.equal(createdBody.auction.whiskyId, createBody.whiskyId)

    const updated = await fetch(`${baseUrl}/api/v1/admin/auctions/${auctionId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ title: 'QA Auction Updated', startingPrice: 150 }),
    })
    assert.equal(updated.status, 200)
    const updatedBody = (await updated.json()) as {
      auction: { title: string; startingPrice: number; status: string }
    }
    assert.equal(updatedBody.auction.title, 'QA Auction Updated')
    assert.equal(updatedBody.auction.startingPrice, 150)
    assert.equal(updatedBody.auction.status, 'draft')

    const started = await fetch(
      `${baseUrl}/api/v1/admin/auctions/${auctionId}/start`,
      { method: 'POST', headers },
    )
    assert.equal(started.status, 200)
    const startedBody = (await started.json()) as {
      auction: { status: string }
    }
    assert.equal(startedBody.auction.status, 'scheduled')

    const listed = await fetch(`${baseUrl}/api/v1/admin/auctions`, { headers })
    assert.equal(listed.status, 200)
    const listedBody = (await listed.json()) as {
      auctions: Array<{ id: string; status: string }>
    }
    const listedAuction = listedBody.auctions.find((a) => a.id === auctionId)
    assert.equal(listedAuction?.status, 'scheduled')

    const editActive = await fetch(
      `${baseUrl}/api/v1/admin/auctions/${auctionId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ title: 'Should fail' }),
      },
    )
    assert.equal(editActive.status, 400)

    const startAgain = await fetch(
      `${baseUrl}/api/v1/admin/auctions/${auctionId}/start`,
      { method: 'POST', headers },
    )
    assert.equal(startAgain.status, 400)
  })

  it('does not start a draft that fails Auction model rules', async () => {
    const adminId = await createUser('admin')
    const auction = await Auction.create({
      whiskyId: 'qa-auction-invalid',
      createdBy: adminId,
      title: 'Invalid price',
      startingPrice: 10,
      startAt: new Date('2026-10-10T00:00:00.000Z'),
      endAt: new Date('2026-10-12T00:00:00.000Z'),
      status: 'draft',
    })
    createdAuctionIds.push(auction.id)
    await Auction.collection.updateOne(
      { _id: auction._id },
      { $set: { startingPrice: -5 } },
    )

    const res = await fetch(
      `${baseUrl}/api/v1/admin/auctions/${auction.id}/start`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${signAccessToken({ userId: adminId })}`,
        },
      },
    )
    assert.equal(res.status, 400)

    const stored = await Auction.findById(auction.id)
    assert.equal(stored?.status, 'draft')
    assert.equal(stored?.startingPrice, -5)
  })

  it('rejects creating an auction whose endAt is not after startAt', async () => {
    const adminId = await createUser('admin')
    const res = await fetch(`${baseUrl}/api/v1/admin/auctions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${signAccessToken({ userId: adminId })}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...createBody, endAt: createBody.startAt }),
    })
    assert.equal(res.status, 400)
    const body = (await res.json()) as { message: string; details: string[] }
    assert.equal(body.message, 'Validation failed')
    assert.ok(body.details.includes('End time must be after start time'))
  })

  it('rejects a draft edit that moves endAt to or before the stored startAt', async () => {
    const adminId = await createUser('admin')
    const auction = await createDraft(adminId, DAY_MS, 3 * DAY_MS)

    const res = await fetch(`${baseUrl}/api/v1/admin/auctions/${auction.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${signAccessToken({ userId: adminId })}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ endAt: auction.startAt.toISOString() }),
    })
    assert.equal(res.status, 400)
    const body = (await res.json()) as { message: string; details: string[] }
    assert.ok(body.details.includes('End time must be after start time'))

    const stored = await Auction.findById(auction.id)
    assert.equal(stored?.endAt.getTime(), auction.endAt.getTime())
  })
})

async function createDraft(
  adminId: string,
  startOffsetMs: number,
  endOffsetMs: number,
) {
  const now = Date.now()
  const auction = await Auction.create({
    whiskyId: 'qa-auction-lifecycle',
    createdBy: adminId,
    title: 'QA Lifecycle',
    startingPrice: 100,
    startAt: new Date(now + startOffsetMs),
    endAt: new Date(now + endOffsetMs),
    status: 'draft',
  })
  createdAuctionIds.push(auction.id)
  return auction
}

async function adminPost(
  path: string,
  adminId: string,
  body?: Record<string, unknown>,
) {
  return fetch(`${baseUrl}/api/v1/admin/auctions${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${signAccessToken({ userId: adminId })}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

type AuctionResponse = {
  auction: {
    id: string
    status: string
    statusHistory: Array<{
      status: string
      message: string
      changedBy: string
      changedAt: string
    }>
  }
}

describe('Admin auction Start lifecycle', () => {
  it('draft + startAt in the future → scheduled', async () => {
    const adminId = await createUser('admin')
    const auction = await createDraft(adminId, DAY_MS, 2 * DAY_MS)

    const res = await adminPost(`/${auction.id}/start`, adminId)
    assert.equal(res.status, 200)
    const body = (await res.json()) as AuctionResponse
    assert.equal(body.auction.status, 'scheduled')
    assert.equal((await Auction.findById(auction.id))?.status, 'scheduled')
  })

  it('draft + startAt reached + endAt in the future → active', async () => {
    const adminId = await createUser('admin')
    const auction = await createDraft(adminId, -60_000, DAY_MS)

    const res = await adminPost(`/${auction.id}/start`, adminId)
    assert.equal(res.status, 200)
    const body = (await res.json()) as AuctionResponse
    assert.equal(body.auction.status, 'active')
    assert.equal((await Auction.findById(auction.id))?.status, 'active')
  })

  it('draft + endAt already passed → 400 and stays draft', async () => {
    const adminId = await createUser('admin')
    const auction = await createDraft(adminId, -2 * DAY_MS, -60_000)

    const res = await adminPost(`/${auction.id}/start`, adminId)
    assert.equal(res.status, 400)
    assert.deepEqual(await res.json(), {
      message: 'Auction end time has already passed',
    })
    assert.equal((await Auction.findById(auction.id))?.status, 'draft')
  })
})

describe('Admin auction Cancel', () => {
  async function createWithStatus(
    adminId: string,
    status: 'draft' | 'scheduled' | 'active' | 'ended' | 'cancelled',
  ) {
    const auction = await createDraft(adminId, DAY_MS, 2 * DAY_MS)
    if (status !== 'draft') {
      auction.status = status
      await auction.save()
    }
    return auction
  }

  for (const status of ['draft', 'scheduled', 'active'] as const) {
    it(`cancels a ${status} auction and records the status change message`, async () => {
      const adminId = await createUser('admin')
      const auction = await createWithStatus(adminId, status)
      const requestedAt = Date.now()

      const res = await adminPost(`/${auction.id}/cancel`, adminId, {
        message: `  Cancel ${status} for QA  `,
      })
      assert.equal(res.status, 200)
      const body = (await res.json()) as AuctionResponse
      assert.equal(body.auction.status, 'cancelled')
      assert.equal(body.auction.statusHistory.length, 1)
      assert.equal(body.auction.statusHistory[0].status, 'cancelled')
      assert.equal(body.auction.statusHistory[0].message, `Cancel ${status} for QA`)
      assert.equal(body.auction.statusHistory[0].changedBy, adminId)

      const stored = await Auction.findById(auction.id)
      assert.equal(stored?.status, 'cancelled')
      assert.equal(stored?.statusHistory.length, 1)
      const change = stored!.statusHistory[0]
      assert.equal(change.status, 'cancelled')
      assert.equal(change.message, `Cancel ${status} for QA`)
      assert.equal(change.changedBy.toString(), adminId)
      assert.ok(change.changedAt.getTime() >= requestedAt - 1000)
      assert.ok(change.changedAt.getTime() <= Date.now() + 1000)
    })
  }

  for (const status of ['ended', 'cancelled'] as const) {
    it(`rejects cancelling an ${status} auction`, async () => {
      const adminId = await createUser('admin')
      const auction = await createWithStatus(adminId, status)

      const res = await adminPost(`/${auction.id}/cancel`, adminId, {
        message: 'Should fail',
      })
      assert.equal(res.status, 400)
      assert.deepEqual(await res.json(), {
        message: 'Only draft, scheduled or active auctions can be cancelled',
      })

      const stored = await Auction.findById(auction.id)
      assert.equal(stored?.status, status)
      assert.equal(stored?.statusHistory.length, 0)
    })
  }

  it('requires a status change message', async () => {
    const adminId = await createUser('admin')
    const auction = await createWithStatus(adminId, 'active')

    for (const body of [{}, { message: '   ' }]) {
      const res = await adminPost(`/${auction.id}/cancel`, adminId, body)
      assert.equal(res.status, 400)
      const resBody = (await res.json()) as { message: string; details: string[] }
      assert.equal(resBody.message, 'Validation failed')
      assert.ok(resBody.details.includes('Status change message is required'))
    }
    assert.equal((await Auction.findById(auction.id))?.status, 'active')
  })

  it('returns 401 without a token and 403 for a non-admin', async () => {
    const adminId = await createUser('admin')
    const auction = await createWithStatus(adminId, 'active')

    const anonymous = await fetch(
      `${baseUrl}/api/v1/admin/auctions/${auction.id}/cancel`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Nope' }),
      },
    )
    assert.equal(anonymous.status, 401)

    const userId = await createUser('user')
    const member = await adminPost(`/${auction.id}/cancel`, userId, {
      message: 'Nope',
    })
    assert.equal(member.status, 403)

    const stored = await Auction.findById(auction.id)
    assert.equal(stored?.status, 'active')
    assert.equal(stored?.statusHistory.length, 0)
  })

  it('returns 404 for a missing auction', async () => {
    const adminId = await createUser('admin')
    const missingId = new mongoose.Types.ObjectId().toString()
    const res = await adminPost(`/${missingId}/cancel`, adminId, {
      message: 'Missing',
    })
    assert.equal(res.status, 404)
  })
})
