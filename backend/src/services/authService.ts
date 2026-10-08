import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { env } from '../config/env'
import { PendingRegistration } from '../models/PendingRegistration'
import { User } from '../models/User'
import type { PublicUser } from '../types/user'
import { AppError } from '../utils/AppError'
import { signAccessToken } from '../utils/jwt'
import { hashPassword, verifyPassword } from '../utils/password'
import { toPublicUser } from '../utils/toPublicUser'
import type {
  GoogleLoginBody,
  LoginBody,
  RegisterBody,
  ResendRegistrationCodeBody,
  VerifyRegistrationBody,
} from '../validations/authValidation'
import {
  verifyGoogleIdToken,
  type GoogleIdentity,
} from './googleAuthService'
import { sendVerificationCode } from './mailService'

const CODE_TTL_MS = 10 * 60 * 1000
const PENDING_TTL_MS = 60 * 60 * 1000
const RESEND_COOLDOWN_MS = 90 * 1000

const INVALID_CREDENTIALS = 'Invalid email or password'
const EMAIL_ALREADY_REGISTERED = 'Email is already registered'
const INVALID_VERIFICATION_CODE = 'Invalid or expired verification code'
const RESEND_TOO_SOON = 'Please wait 90 seconds before requesting another code'
const GOOGLE_EMAIL_CONFLICT =
  'An account with this email already exists. Please sign in with email and password.'

type GoogleTokenVerifier = (credential: string) => Promise<GoogleIdentity>

/** Default: real Google ID token verification. Overridable in tests. */
let googleTokenVerifier: GoogleTokenVerifier = verifyGoogleIdToken

/** Test-only hook so suites never call Google over the network. */
export function setGoogleTokenVerifierForTests(
  verifier: GoogleTokenVerifier | null,
): void {
  googleTokenVerifier = verifier ?? verifyGoogleIdToken
}

function isDuplicateEmailError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const err = error as { code?: number; keyPattern?: Record<string, unknown> }
  return err.code === 11000 && Boolean(err.keyPattern?.email)
}

function isDuplicateGoogleIdError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const err = error as { code?: number; keyPattern?: Record<string, unknown> }
  return err.code === 11000 && Boolean(err.keyPattern?.googleId)
}

function generateVerificationCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

function hashVerificationCode(email: string, code: string): string {
  return createHmac('sha256', env.jwtSecret).update(`${email}:${code}`).digest('hex')
}

function codeMatches(email: string, code: string, codeHash: string): boolean {
  const actual = Buffer.from(hashVerificationCode(email, code), 'hex')
  const expected = Buffer.from(codeHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function assertResendCooldownPassed(lastSentAt: Date | undefined, now: number): void {
  if (lastSentAt && now - lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new AppError(429, RESEND_TOO_SOON)
  }
}

/** Sends a new code first, then stores it; nothing is saved when sending fails. */
async function sendCodeAndSavePending(
  email: string,
  fields: { name?: string; passwordHash?: string },
): Promise<void> {
  const code = generateVerificationCode()
  await sendVerificationCode(email, code, 'register')

  const now = Date.now()
  await PendingRegistration.updateOne(
    { email },
    {
      $set: {
        ...fields,
        codeHash: hashVerificationCode(email, code),
        codeExpiresAt: new Date(now + CODE_TTL_MS),
        lastSentAt: new Date(now),
        expiresAt: new Date(now + PENDING_TTL_MS),
      },
    },
    { upsert: Boolean(fields.passwordHash) },
  )
}

/** Starts email/password sign-up: no User is created until the code is verified. */
export async function registerUser(input: RegisterBody): Promise<{ email: string }> {
  if (await User.exists({ email: input.email })) {
    throw new AppError(409, EMAIL_ALREADY_REGISTERED)
  }

  const pending = await PendingRegistration.findOne({ email: input.email })
  assertResendCooldownPassed(pending?.lastSentAt, Date.now())

  const passwordHash = await hashPassword(input.password)
  await sendCodeAndSavePending(input.email, { name: input.name, passwordHash })

  return { email: input.email }
}

export async function resendRegistrationCode(
  input: ResendRegistrationCodeBody,
): Promise<void> {
  const pending = await PendingRegistration.findOne({ email: input.email })
  if (!pending) {
    return
  }

  assertResendCooldownPassed(pending.lastSentAt, Date.now())
  await sendCodeAndSavePending(input.email, {})
}

export async function verifyRegistration(
  input: VerifyRegistrationBody,
): Promise<{ token: string; user: PublicUser }> {
  const pending = await PendingRegistration.findOne({ email: input.email }).select(
    '+passwordHash +codeHash',
  )

  if (
    !pending ||
    pending.codeExpiresAt.getTime() <= Date.now() ||
    !codeMatches(input.email, input.code, pending.codeHash)
  ) {
    throw new AppError(400, INVALID_VERIFICATION_CODE)
  }

  let user
  try {
    // role is never taken from the client; new accounts are always 'user'.
    user = await User.create({
      name: pending.name,
      email: pending.email,
      passwordHash: pending.passwordHash,
      role: 'user',
    })
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      await PendingRegistration.deleteOne({ _id: pending._id })
      throw new AppError(409, EMAIL_ALREADY_REGISTERED)
    }
    throw error
  }

  await PendingRegistration.deleteOne({ _id: pending._id })

  const token = signAccessToken({ userId: user._id.toString() })
  return { token, user: toPublicUser(user) }
}

export async function loginUser(
  input: LoginBody,
): Promise<{ token: string; user: PublicUser }> {
  // Only force-include select:false passwordHash.
  // Do NOT add other field names here — Mongoose inclusive select would
  // drop name/email/avatar/bio from the login response (Profile looks empty
  // until refresh via /auth/me).
  const user = await User.findOne({ email: input.email }).select('+passwordHash')

  if (!user) {
    throw new AppError(401, INVALID_CREDENTIALS)
  }

  if (!user.passwordHash) {
    if (user.googleId) {
      throw new AppError(401, 'Please sign in with Google')
    }
    throw new AppError(401, INVALID_CREDENTIALS)
  }

  const matches = await verifyPassword(input.password, user.passwordHash)
  if (!matches) {
    throw new AppError(401, INVALID_CREDENTIALS)
  }

  const token = signAccessToken({ userId: user._id.toString() })

  return {
    token,
    user: toPublicUser(user),
  }
}

export async function loginWithGoogle(
  input: GoogleLoginBody,
): Promise<{ token: string; user: PublicUser }> {
  const identity = await googleTokenVerifier(input.credential)
  await PendingRegistration.deleteOne({ email: identity.email })

  const existingByGoogle = await User.findOne({ googleId: identity.sub })
  if (existingByGoogle) {
    let dirty = false
    if (identity.name && existingByGoogle.name !== identity.name) {
      existingByGoogle.name = identity.name.slice(0, 100)
      dirty = true
    }
    if (identity.picture && existingByGoogle.avatar !== identity.picture) {
      existingByGoogle.avatar = identity.picture
      dirty = true
    }
    if (dirty) {
      await existingByGoogle.save()
    }

    const token = signAccessToken({ userId: existingByGoogle._id.toString() })
    return {
      token,
      user: toPublicUser(existingByGoogle),
    }
  }

  const existingByEmail = await User.findOne({ email: identity.email })
  if (existingByEmail) {
    throw new AppError(409, GOOGLE_EMAIL_CONFLICT)
  }

  try {
    // Google sign-up always creates a normal user; admin is set only in DB.
    const user = await User.create({
      name: identity.name.slice(0, 100) || 'WhiskyHello User',
      email: identity.email,
      googleId: identity.sub,
      avatar: identity.picture || '',
      role: 'user',
    })

    const token = signAccessToken({ userId: user._id.toString() })
    return {
      token,
      user: toPublicUser(user),
    }
  } catch (error) {
    if (isDuplicateEmailError(error) || isDuplicateGoogleIdError(error)) {
      throw new AppError(409, GOOGLE_EMAIL_CONFLICT)
    }
    throw error
  }
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId)

  if (!user) {
    throw new AppError(401, 'Unauthorized')
  }

  return toPublicUser(user)
}
