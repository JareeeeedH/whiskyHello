/**
 * Forgot password: 6-digit email code + new password.
 * Requires TEST_MONGODB_URI (dedicated test database). Mail sending is always mocked.
 */
import assert from 'node:assert/strict'
import { after, afterEach, before, describe, it } from 'node:test'
import mongoose from 'mongoose'
import { User } from '../models/User'
import { AppError } from '../utils/AppError'
import { hashPassword } from '../utils/password'
import { loginUser, requestPasswordReset, resetPassword } from './authService'
import {
  setVerificationCodeMailerForTests,
  type VerificationCodePurpose,
} from './mailService'
import { resetPasswordSchema } from '../validations/authValidation'
import {
  connectTestDatabase,
  disconnectTestDatabase,
} from '../test/testDatabase'

const EMAIL_PREFIX = 'qa-reset-'
const OLD_PASSWORD = 'oldpassword123'
const NEW_PASSWORD = 'newpassword456'
const sentCodes: Array<{ email: string; code: string; purpose: VerificationCodePurpose }> = []

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

function useRecordingMailer(): void {
  setVerificationCodeMailerForTests(async (email, code, purpose) => {
    sentCodes.push({ email, code, purpose })
  })
}

async function createPasswordUser(label: string): Promise<string> {
  const email = uniqueEmail(label)
  await User.create({
    name: 'Reset QA',
    email,
    passwordHash: await hashPassword(OLD_PASSWORD),
  })
  return email
}

const isStatus = (status: number) => (err: unknown) =>
  err instanceof AppError && err.statusCode === status

describe('resetPasswordSchema', () => {
  it('rejects a new password shorter than 8 characters', () => {
    const { error } = resetPasswordSchema.validate({
      email: 'a@example.com',
      code: '123456',
      password: 'short',
    })
    assert.ok(error)
  })

  it('accepts email, 6-digit code, and valid password', () => {
    const { error } = resetPasswordSchema.validate({
      email: 'a@example.com',
      code: '123456',
      password: NEW_PASSWORD,
    })
    assert.equal(error, undefined)
  })
})

describe('forgot password (integration)', () => {
  before(async () => {
    await connectTestDatabase()
    await User.deleteMany({ email: new RegExp(`^${EMAIL_PREFIX}`) })
  })

  afterEach(() => {
    setVerificationCodeMailerForTests(null)
  })

  after(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({ email: new RegExp(`^${EMAIL_PREFIX}`) })
      await disconnectTestDatabase()
    }
  })

  it('sends a password-reset code without changing the password', async () => {
    useRecordingMailer()
    const email = await createPasswordUser('request')

    await requestPasswordReset({ email })

    const sent = [...sentCodes].reverse().find((item) => item.email === email)
    assert.equal(sent?.purpose, 'passwordReset')
    assert.match(lastCodeFor(email), /^\d{6}$/)
    const login = await loginUser({ email, password: OLD_PASSWORD })
    assert.equal(login.user.email, email)
  })

  it('correct code sets the new password, logs in, and cannot be reused', async () => {
    useRecordingMailer()
    const email = await createPasswordUser('reset-ok')
    await requestPasswordReset({ email })
    const code = lastCodeFor(email)

    const result = await resetPassword({ email, code, password: NEW_PASSWORD })

    assert.ok(result.token)
    assert.equal(result.user.email, email)
    await loginUser({ email, password: NEW_PASSWORD })
    await assert.rejects(() => loginUser({ email, password: OLD_PASSWORD }), isStatus(401))
    await assert.rejects(
      () => resetPassword({ email, code, password: 'anotherpass789' }),
      isStatus(400),
    )

    const stored = await User.findOne({ email }).select(
      '+passwordResetCodeHash +passwordResetCodeExpiresAt +passwordResetLastSentAt +passwordResetAttempts',
    )
    assert.equal(stored?.passwordResetCodeHash, undefined)
    assert.equal(stored?.passwordResetAttempts, undefined)
  })

  it('wrong code is rejected and keeps the old password', async () => {
    useRecordingMailer()
    const email = await createPasswordUser('wrong')
    await requestPasswordReset({ email })

    await assert.rejects(
      () => resetPassword({ email, code: wrongCode(lastCodeFor(email)), password: NEW_PASSWORD }),
      isStatus(400),
    )
    await loginUser({ email, password: OLD_PASSWORD })
  })

  it('5 wrong codes invalidate the code even if the correct one is entered next', async () => {
    useRecordingMailer()
    const email = await createPasswordUser('attempts')
    await requestPasswordReset({ email })
    const code = lastCodeFor(email)

    for (let i = 0; i < 5; i += 1) {
      await assert.rejects(
        () => resetPassword({ email, code: wrongCode(code), password: NEW_PASSWORD }),
        isStatus(400),
      )
    }

    await assert.rejects(
      () => resetPassword({ email, code, password: NEW_PASSWORD }),
      isStatus(400),
    )
    await loginUser({ email, password: OLD_PASSWORD })
  })

  it('expired code is rejected', async () => {
    useRecordingMailer()
    const email = await createPasswordUser('expired')
    await requestPasswordReset({ email })
    await User.updateOne(
      { email },
      { $set: { passwordResetCodeExpiresAt: new Date(Date.now() - 1000) } },
    )

    await assert.rejects(
      () => resetPassword({ email, code: lastCodeFor(email), password: NEW_PASSWORD }),
      isStatus(400),
    )
  })

  it('unknown email returns silently and sends nothing', async () => {
    useRecordingMailer()
    const before = sentCodes.length

    await requestPasswordReset({ email: uniqueEmail('unknown') })

    assert.equal(sentCodes.length, before)
  })

  it('Google-only account returns 409 and sends nothing', async () => {
    useRecordingMailer()
    const email = uniqueEmail('google')
    await User.create({ name: 'Google Only', email, googleId: `google-sub-reset-${Date.now()}` })
    const before = sentCodes.length

    await assert.rejects(() => requestPasswordReset({ email }), isStatus(409))
    assert.equal(sentCodes.length, before)
  })

  it('requesting again within 90 seconds returns 429; after that the old code stops working', async () => {
    useRecordingMailer()
    const email = await createPasswordUser('cooldown')
    await requestPasswordReset({ email })
    const oldCode = lastCodeFor(email)

    await assert.rejects(() => requestPasswordReset({ email }), isStatus(429))

    const moveBack = () =>
      User.updateOne(
        { email },
        { $set: { passwordResetLastSentAt: new Date(Date.now() - 91_000) } },
      )
    await moveBack()
    await requestPasswordReset({ email })
    let newCode = lastCodeFor(email)
    if (newCode === oldCode) {
      await moveBack()
      await requestPasswordReset({ email })
      newCode = lastCodeFor(email)
    }

    await assert.rejects(
      () => resetPassword({ email, code: oldCode, password: NEW_PASSWORD }),
      isStatus(400),
    )
    await resetPassword({ email, code: newCode, password: NEW_PASSWORD })
  })

  it('mail failure returns 503 and stores no code', async () => {
    setVerificationCodeMailerForTests(async () => {
      throw new AppError(503, 'Failed to send verification email')
    })
    const email = await createPasswordUser('mail-fail')

    await assert.rejects(() => requestPasswordReset({ email }), isStatus(503))

    const stored = await User.findOne({ email }).select('+passwordResetCodeHash')
    assert.equal(stored?.passwordResetCodeHash, undefined)
  })
})
