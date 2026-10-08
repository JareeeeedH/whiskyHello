/**
 * Email/password registration with 6-digit email verification code.
 * Requires TEST_MONGODB_URI (dedicated test database). Mail sending is always mocked.
 */
import assert from 'node:assert/strict'
import { after, afterEach, before, describe, it } from 'node:test'
import mongoose from 'mongoose'
import { PendingRegistration } from '../models/PendingRegistration'
import { User } from '../models/User'
import { AppError } from '../utils/AppError'
import { hashPassword } from '../utils/password'
import {
  loginUser,
  loginWithGoogle,
  registerUser,
  resendRegistrationCode,
  setGoogleTokenVerifierForTests,
  verifyRegistration,
} from './authService'
import { setVerificationCodeMailerForTests } from './mailService'
import { verifyRegistrationSchema } from '../validations/authValidation'
import {
  connectTestDatabase,
  disconnectTestDatabase,
} from '../test/testDatabase'

const EMAIL_PREFIX = 'qa-verify-'
const sentCodes: Array<{ email: string; code: string }> = []

function uniqueEmail(label: string): string {
  return `${EMAIL_PREFIX}${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}

function lastCodeFor(email: string): string {
  const entry = [...sentCodes].reverse().find((item) => item.email === email)
  assert.ok(entry, `expected a code sent to ${email}`)
  return entry.code
}

function wrongCode(code: string): string {
  return code === '000000' ? '111111' : '000000'
}

async function moveLastSentAtBack(email: string): Promise<void> {
  await PendingRegistration.updateOne(
    { email },
    { $set: { lastSentAt: new Date(Date.now() - 91_000) } },
  )
}

function useRecordingMailer(): void {
  setVerificationCodeMailerForTests(async (email, code) => {
    sentCodes.push({ email, code })
  })
}

async function cleanup(): Promise<void> {
  await PendingRegistration.deleteMany({ email: new RegExp(`^${EMAIL_PREFIX}`) })
  await User.deleteMany({ email: new RegExp(`^${EMAIL_PREFIX}`) })
}

describe('verifyRegistrationSchema', () => {
  it('rejects codes that are not exactly 6 digits', () => {
    for (const code of ['12345', '1234567', 'abcdef', '']) {
      const { error } = verifyRegistrationSchema.validate({
        email: 'a@example.com',
        code,
      })
      assert.ok(error, `expected "${code}" to be rejected`)
    }
  })

  it('accepts a 6-digit code', () => {
    const { error } = verifyRegistrationSchema.validate({
      email: 'a@example.com',
      code: '012345',
    })
    assert.equal(error, undefined)
  })
})

describe('registration with email verification (integration)', () => {
  before(async () => {
    await connectTestDatabase()
    await PendingRegistration.init()
    await cleanup()
  })

  afterEach(() => {
    setVerificationCodeMailerForTests(null)
    setGoogleTokenVerifierForTests(null)
  })

  after(async () => {
    if (mongoose.connection.readyState === 1) {
      await cleanup()
      await disconnectTestDatabase()
    }
  })

  it('register stores a pending sign-up and sends a 6-digit code without creating a User', async () => {
    useRecordingMailer()
    const email = uniqueEmail('pending')

    const result = await registerUser({ name: 'Pending', email, password: 'password12345' })

    assert.equal(result.email, email)
    assert.match(lastCodeFor(email), /^\d{6}$/)
    assert.equal(await User.exists({ email }), null)

    const pending = await PendingRegistration.findOne({ email }).select('+passwordHash +codeHash')
    assert.ok(pending)
    assert.ok(pending.passwordHash.startsWith('scrypt$'))
    assert.notEqual(pending.codeHash, lastCodeFor(email))
  })

  it('correct code creates the User, removes the pending sign-up, and returns a token', async () => {
    useRecordingMailer()
    const email = uniqueEmail('verify-ok')
    await registerUser({ name: 'Verified', email, password: 'password12345' })

    const result = await verifyRegistration({ email, code: lastCodeFor(email) })

    assert.ok(result.token)
    assert.equal(result.user.email, email)
    assert.equal(result.user.role, 'user')
    assert.equal(await PendingRegistration.exists({ email }), null)

    const login = await loginUser({ email, password: 'password12345' })
    assert.equal(login.user.id, result.user.id)
  })

  it('wrong code is rejected and no User is created', async () => {
    useRecordingMailer()
    const email = uniqueEmail('verify-wrong')
    await registerUser({ name: 'Wrong', email, password: 'password12345' })

    await assert.rejects(
      () => verifyRegistration({ email, code: wrongCode(lastCodeFor(email)) }),
      (err: unknown) => err instanceof AppError && err.statusCode === 400,
    )
    assert.equal(await User.exists({ email }), null)
  })

  it('expired code is rejected', async () => {
    useRecordingMailer()
    const email = uniqueEmail('verify-expired')
    await registerUser({ name: 'Expired', email, password: 'password12345' })
    await PendingRegistration.updateOne(
      { email },
      { $set: { codeExpiresAt: new Date(Date.now() - 1000) } },
    )

    await assert.rejects(
      () => verifyRegistration({ email, code: lastCodeFor(email) }),
      (err: unknown) => err instanceof AppError && err.statusCode === 400,
    )
  })

  it('register returns 409 for an existing User email and sends nothing', async () => {
    useRecordingMailer()
    const email = uniqueEmail('existing')
    await User.create({ name: 'Existing', email, passwordHash: await hashPassword('password12345') })
    const before = sentCodes.length

    await assert.rejects(
      () => registerUser({ name: 'Again', email, password: 'password12345' }),
      (err: unknown) => err instanceof AppError && err.statusCode === 409,
    )
    assert.equal(sentCodes.length, before)
  })

  it('register and resend within 90 seconds return 429', async () => {
    useRecordingMailer()
    const email = uniqueEmail('cooldown')
    await registerUser({ name: 'Cooldown', email, password: 'password12345' })

    await assert.rejects(
      () => resendRegistrationCode({ email }),
      (err: unknown) => err instanceof AppError && err.statusCode === 429,
    )
    await assert.rejects(
      () => registerUser({ name: 'Cooldown', email, password: 'password12345' }),
      (err: unknown) => err instanceof AppError && err.statusCode === 429,
    )
  })

  it('resend after 90 seconds sends a new code and the old code stops working', async () => {
    useRecordingMailer()
    const email = uniqueEmail('resend')
    await registerUser({ name: 'Resend', email, password: 'password12345' })
    const oldCode = lastCodeFor(email)
    await moveLastSentAtBack(email)

    await resendRegistrationCode({ email })
    let newCode = lastCodeFor(email)
    if (newCode === oldCode) {
      await moveLastSentAtBack(email)
      await resendRegistrationCode({ email })
      newCode = lastCodeFor(email)
    }

    await assert.rejects(
      () => verifyRegistration({ email, code: oldCode }),
      (err: unknown) => err instanceof AppError && err.statusCode === 400,
    )
    const result = await verifyRegistration({ email, code: newCode })
    assert.equal(result.user.email, email)
  })

  it('registering again after 90 seconds overwrites name and password', async () => {
    useRecordingMailer()
    const email = uniqueEmail('overwrite')
    await registerUser({ name: 'First', email, password: 'password12345' })
    await moveLastSentAtBack(email)

    await registerUser({ name: 'Second', email, password: 'newpassword678' })
    const result = await verifyRegistration({ email, code: lastCodeFor(email) })

    assert.equal(result.user.name, 'Second')
    const login = await loginUser({ email, password: 'newpassword678' })
    assert.equal(login.user.id, result.user.id)
  })

  it('resend for an email without a pending sign-up succeeds silently and sends nothing', async () => {
    useRecordingMailer()
    const before = sentCodes.length

    await resendRegistrationCode({ email: uniqueEmail('unknown') })

    assert.equal(sentCodes.length, before)
  })

  it('mail failure returns 503 and stores nothing', async () => {
    setVerificationCodeMailerForTests(async () => {
      throw new AppError(503, 'Failed to send verification email')
    })
    const email = uniqueEmail('mail-fail')

    await assert.rejects(
      () => registerUser({ name: 'Mail Fail', email, password: 'password12345' }),
      (err: unknown) => err instanceof AppError && err.statusCode === 503,
    )
    assert.equal(await PendingRegistration.exists({ email }), null)
  })

  it('Google login removes a pending sign-up for the same email', async () => {
    useRecordingMailer()
    const email = uniqueEmail('google')
    await registerUser({ name: 'Pending Google', email, password: 'password12345' })
    setGoogleTokenVerifierForTests(async () => ({
      sub: `google-sub-verify-${Date.now()}`,
      email,
      emailVerified: true,
      name: 'Google User',
      picture: '',
    }))

    const result = await loginWithGoogle({ credential: 'fake-token' })

    assert.equal(result.user.email, email)
    assert.equal(await PendingRegistration.exists({ email }), null)
  })
})
