/**
 * Admin RBAC tests: middleware + users list + role defaults.
 * Uses real MongoDB when available; Google verifier is mocked where needed.
 */
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, beforeEach, describe, it } from 'node:test'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import app from '../app'
import { env } from '../config/env'
import { User } from '../models/User'
import { signAccessToken } from '../utils/jwt'
import { hashPassword } from '../utils/password'
import { toPublicUser } from '../utils/toPublicUser'
import {
  loginWithGoogle,
  registerUser,
  setGoogleTokenVerifierForTests,
} from '../services/authService'
import { registerSchema } from '../validations/authValidation'

const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/whiskyhello_test'

let mongoReady = false
const createdUserIds: string[] = []
let server: http.Server | null = null
let baseUrl = ''

async function startServer(): Promise<void> {
  server = http.createServer(app)
  await new Promise<void>((resolve) => {
    server!.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
}

async function stopServer(): Promise<void> {
  if (!server) {
    return
  }
  await new Promise<void>((resolve, reject) => {
    server!.close((err) => (err ? reject(err) : resolve()))
  })
  server = null
}

before(async () => {
  try {
    await mongoose.connect(mongoUri)
    mongoReady = true
  } catch {
    mongoReady = false
  }
  await startServer()
})

after(async () => {
  await stopServer()
  if (mongoReady && createdUserIds.length > 0) {
    await User.deleteMany({ _id: { $in: createdUserIds } })
  }
  if (mongoReady) {
    await mongoose.disconnect()
  }
  setGoogleTokenVerifierForTests(null)
})

beforeEach(() => {
  setGoogleTokenVerifierForTests(null)
})

describe('registerSchema role stripping', () => {
  it('strips role from register body so clients cannot escalate', () => {
    const { error, value } = registerSchema.validate(
      {
        name: 'Escalator',
        email: 'escalate@example.com',
        password: 'password12345',
        role: 'admin',
      },
      { abortEarly: false, stripUnknown: true },
    )

    assert.equal(error, undefined)
    assert.equal(
      Object.prototype.hasOwnProperty.call(value, 'role'),
      false,
    )
  })
})

describe('Admin RBAC', () => {
  it('register always creates role user even if role=admin is attempted', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const email = `qa-role-register-${Date.now()}@example.com`
    const user = await registerUser({
      name: 'Role Register',
      email,
      password: 'password12345',
      // @ts-expect-error intentional malicious client field
      role: 'admin',
    })
    createdUserIds.push(user.id)

    assert.equal(user.role, 'user')

    const stored = await User.findById(user.id).select('role passwordHash')
    assert.equal(stored?.role, 'user')
    assert.ok(!('passwordHash' in user))
  })

  it('Google OAuth new user defaults to role user', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const email = `qa-role-google-${Date.now()}@example.com`
    setGoogleTokenVerifierForTests(async () => ({
      sub: `google-sub-role-${Date.now()}`,
      email,
      emailVerified: true,
      name: 'Google Role User',
      picture: '',
    }))

    const result = await loginWithGoogle({ credential: 'fake-token' })
    createdUserIds.push(result.user.id)

    assert.equal(result.user.role, 'user')
    const stored = await User.findById(result.user.id).select('role')
    assert.equal(stored?.role, 'user')
  })

  it('legacy users without role are treated as user in PublicUser', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const email = `qa-role-legacy-${Date.now()}@example.com`
    const created = await User.create({
      name: 'Legacy',
      email,
      passwordHash: await hashPassword('password12345'),
      role: 'user',
    })
    createdUserIds.push(created.id)

    await User.collection.updateOne(
      { _id: created._id },
      { $unset: { role: '' } },
    )

    const reloaded = await User.findById(created.id)
    assert.ok(reloaded)
    assert.equal(toPublicUser(reloaded).role, 'user')
  })

  it('GET /api/v1/admin/users → 401 when unauthenticated', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users`)
    assert.equal(res.status, 401)
  })

  it('GET /api/v1/admin/users → 403 for normal authenticated user', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const email = `qa-admin-normal-${Date.now()}@example.com`
    const user = await User.create({
      name: 'Normal User',
      email,
      passwordHash: await hashPassword('password12345'),
      role: 'user',
    })
    createdUserIds.push(user.id)

    const token = signAccessToken({ userId: user.id })
    const res = await fetch(`${baseUrl}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(res.status, 403)
  })

  it('GET /api/v1/admin/users → 200 for admin without secrets', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const email = `qa-admin-ok-${Date.now()}@example.com`
    const admin = await User.create({
      name: 'Admin User',
      email,
      passwordHash: await hashPassword('password12345'),
      role: 'admin',
    })
    createdUserIds.push(admin.id)

    const normal = await User.create({
      name: 'Listed User',
      email: `qa-admin-listed-${Date.now()}@example.com`,
      passwordHash: await hashPassword('password12345'),
      role: 'user',
    })
    createdUserIds.push(normal.id)

    const token = signAccessToken({ userId: admin.id })
    const res = await fetch(`${baseUrl}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(res.status, 200)

    const body = (await res.json()) as {
      users: Array<Record<string, unknown>>
    }
    assert.ok(Array.isArray(body.users))
    assert.ok(body.users.length >= 2)

    const ids = body.users.map((u) => u.id)
    assert.ok(ids.includes(admin.id))
    assert.ok(ids.includes(normal.id))

    for (const u of body.users) {
      assert.ok(typeof u.id === 'string')
      assert.ok(typeof u.name === 'string')
      assert.ok(typeof u.email === 'string')
      assert.ok(typeof u.avatar === 'string')
      assert.ok(u.role === 'user' || u.role === 'admin')
      assert.ok(u.createdAt)

      assert.equal('passwordHash' in u, false)
      assert.equal('googleId' in u, false)
      assert.equal('credential' in u, false)
      assert.equal('accessToken' in u, false)
      assert.equal('refreshToken' in u, false)
    }

    const createdAts = body.users.map((u) =>
      new Date(String(u.createdAt)).getTime(),
    )
    for (let i = 1; i < createdAts.length; i += 1) {
      assert.ok(createdAts[i - 1]! >= createdAts[i]!)
    }
  })

  it('JWT with invalid secret cannot access admin users', async () => {
    const fake = jwt.sign({ userId: '000000000000000000000000' }, 'wrong-secret')
    const res = await fetch(`${baseUrl}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${fake}` },
    })
    assert.equal(res.status, 401)
    // silence unused env import concern if tree-shaken differently
    assert.ok(env.jwtSecret)
  })
})
