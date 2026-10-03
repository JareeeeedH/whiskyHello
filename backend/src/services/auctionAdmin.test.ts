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

const createBody = {
  whiskyId: 'qa-auction-whisky',
  title: 'QA Auction',
  description: 'Draft bottle',
  startingPrice: 120,
  startAt: '2026-10-10T00:00:00.000Z',
  endAt: '2026-10-12T00:00:00.000Z',
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
    assert.equal(startedBody.auction.status, 'active')

    const listed = await fetch(`${baseUrl}/api/v1/admin/auctions`, { headers })
    assert.equal(listed.status, 200)
    const listedBody = (await listed.json()) as {
      auctions: Array<{ id: string; status: string }>
    }
    const listedAuction = listedBody.auctions.find((a) => a.id === auctionId)
    assert.equal(listedAuction?.status, 'active')

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
})
