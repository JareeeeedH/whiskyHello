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
} from '../validations/authValidation'
import {
  verifyGoogleIdToken,
  type GoogleIdentity,
} from './googleAuthService'

const INVALID_CREDENTIALS = 'Invalid email or password'
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

export async function registerUser(input: RegisterBody): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password)

  try {
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
    })

    return toPublicUser(user)
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      throw new AppError(409, 'Email is already registered')
    }

    throw error
  }
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
    const user = await User.create({
      name: identity.name.slice(0, 100) || 'WhiskyHello User',
      email: identity.email,
      googleId: identity.sub,
      avatar: identity.picture || '',
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
