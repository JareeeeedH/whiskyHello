/**
 * Google auth unit + integration tests.
 * Google network verification is mocked; MongoDB used when available.
 */
import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { User } from '../models/User'
import { AppError } from '../utils/AppError'
import { hashPassword } from '../utils/password'
import { env } from '../config/env'
import {
  buildGoogleIdentityFromPayload,
  type GoogleIdentity,
} from './googleAuthService'
import {
  loginUser,
  loginWithGoogle,
  registerUser,
  setGoogleTokenVerifierForTests,
} from './authService'
import { googleLoginSchema } from '../validations/authValidation'

const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/whiskyhello_test'

let mongoReady = false
const createdUserIds: string[] = []

const mockIdentity = (overrides: Partial<GoogleIdentity> = {}): GoogleIdentity => ({
  sub: 'google-sub-qa-1',
  email: `qa-google-${Date.now()}@example.com`,
  emailVerified: true,
  name: 'QA Google User',
  picture: 'https://example.com/avatar.png',
  ...overrides,
})

describe('googleLoginSchema', () => {
  it('rejects missing credential with validation error', () => {
    const { error } = googleLoginSchema.validate({})
    assert.ok(error)
    assert.match(error.message, /credential/i)
  })

  it('rejects empty credential', () => {
    const { error } = googleLoginSchema.validate({ credential: '   ' })
    assert.ok(error)
  })

  it('accepts a non-empty credential string', () => {
    const { error, value } = googleLoginSchema.validate({
      credential: 'eyJhbGciOiJSUzI1NiJ9.payload.sig',
    })
    assert.equal(error, undefined)
    assert.equal(typeof value.credential, 'string')
  })
})

describe('buildGoogleIdentityFromPayload', () => {
  const audience = 'test-client-id.apps.googleusercontent.com'
  const base = {
    sub: 'sub-123',
    email: 'Person@Example.com',
    email_verified: true as const,
    name: 'Person',
    picture: 'https://lh3.googleusercontent.com/a/x',
    iss: 'https://accounts.google.com',
    aud: audience,
  }

  it('accepts a valid Google payload', () => {
    const identity = buildGoogleIdentityFromPayload(base, audience)
    assert.equal(identity.sub, 'sub-123')
    assert.equal(identity.email, 'person@example.com')
    assert.equal(identity.name, 'Person')
  })

  it('rejects wrong audience', () => {
    assert.throws(
      () =>
        buildGoogleIdentityFromPayload(
          { ...base, aud: 'other-client.apps.googleusercontent.com' },
          audience,
        ),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 401 &&
        err.message === 'Invalid Google credential',
    )
  })

  it('rejects wrong issuer', () => {
    assert.throws(
      () =>
        buildGoogleIdentityFromPayload(
          { ...base, iss: 'https://evil.example.com' },
          audience,
        ),
      (err: unknown) =>
        err instanceof AppError && err.statusCode === 401,
    )
  })
})

describe('authService Google + password (integration)', () => {
  before(async () => {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 })
      mongoReady = true
      await User.deleteMany({ email: /^qa-google-/ })
    } catch {
      mongoReady = false
    }
  })

  beforeEach(() => {
    setGoogleTokenVerifierForTests(null)
  })

  after(async () => {
    setGoogleTokenVerifierForTests(null)
    if (!mongoReady) {
      return
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } })
    }
    await User.deleteMany({ email: /^qa-google-/ })
    await mongoose.disconnect()
  })

  it('creates a new Google user and returns WhiskyHello JWT', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const identity = mockIdentity({
      email: `qa-google-new-${Date.now()}@example.com`,
      sub: `google-sub-new-${Date.now()}`,
    })
    setGoogleTokenVerifierForTests(async () => identity)

    const result = await loginWithGoogle({ credential: 'fake-token' })

    createdUserIds.push(result.user.id)
    assert.equal(result.user.email, identity.email)
    assert.equal(result.user.name, identity.name)
    assert.ok(result.token)

    const decoded = jwt.verify(result.token, env.jwtSecret) as {
      userId: string
    }
    assert.equal(decoded.userId, result.user.id)

    const stored = await User.findById(result.user.id).select(
      '+passwordHash googleId role',
    )
    assert.ok(stored)
    assert.equal(stored.googleId, identity.sub)
    assert.equal(stored.passwordHash, undefined)
    assert.equal(result.user.role, 'user')
    assert.equal(stored.role, 'user')
  })

  it('logs in existing googleId user without creating a duplicate', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const sub = `google-sub-exist-${Date.now()}`
    const email = `qa-google-exist-${Date.now()}@example.com`
    const existing = await User.create({
      name: 'Existing Google',
      email,
      googleId: sub,
      avatar: '',
    })
    createdUserIds.push(existing.id)

    const identity = mockIdentity({
      sub,
      email,
      name: 'Updated Google Name',
      picture: 'https://example.com/new-avatar.png',
    })
    setGoogleTokenVerifierForTests(async () => identity)

    const result = await loginWithGoogle({ credential: 'fake-token' })

    assert.equal(result.user.id, existing.id)
    assert.equal(result.user.name, 'Updated Google Name')
    assert.ok(result.token)

    const count = await User.countDocuments({ googleId: sub })
    assert.equal(count, 1)
  })

  it('rejects when email exists without googleId (no auto-merge)', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const email = `qa-google-conflict-${Date.now()}@example.com`
    const passwordUser = await User.create({
      name: 'Password User',
      email,
      passwordHash: await hashPassword('password12345'),
    })
    createdUserIds.push(passwordUser.id)

    const identity = mockIdentity({
      email,
      sub: `google-sub-conflict-${Date.now()}`,
    })
    setGoogleTokenVerifierForTests(async () => identity)

    await assert.rejects(
      () => loginWithGoogle({ credential: 'fake-token' }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 409 &&
        /already exists/i.test(err.message),
    )

    const unchanged = await User.findById(passwordUser.id).select('googleId')
    assert.equal(unchanged?.googleId, undefined)
  })

  it('rejects invalid Google credential without throwing 500', async () => {
    setGoogleTokenVerifierForTests(async () => {
      throw new AppError(401, 'Invalid Google credential')
    })

    await assert.rejects(
      () => loginWithGoogle({ credential: 'bad-token' }),
      (err: unknown) =>
        err instanceof AppError && err.statusCode === 401,
    )
  })

  it('password login on Google-only user returns 401, not server error', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const email = `qa-google-only-login-${Date.now()}@example.com`
    const googleOnly = await User.create({
      name: 'Google Only',
      email,
      googleId: `google-sub-only-${Date.now()}`,
    })
    createdUserIds.push(googleOnly.id)

    await assert.rejects(
      () => loginUser({ email, password: 'anything' }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 401 &&
        /Google/i.test(err.message),
    )
  })

  it('email/password register and login still work', async (t) => {
    if (!mongoReady) {
      t.skip('MongoDB not available')
      return
    }

    const email = `qa-google-password-${Date.now()}@example.com`

    const user = await registerUser({
      name: 'Password QA',
      email,
      password: 'password12345',
    })
    createdUserIds.push(user.id)

    const result = await loginUser({ email, password: 'password12345' })
    assert.equal(result.user.id, user.id)
    assert.ok(result.token)
  })
})
