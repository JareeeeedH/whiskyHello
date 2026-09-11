import { User } from '../models/User'
import type { PublicUser } from '../types/user'
import { AppError } from '../utils/AppError'
import { signAccessToken } from '../utils/jwt'
import { hashPassword, verifyPassword } from '../utils/password'
import { toPublicUser } from '../utils/toPublicUser'
import type { LoginBody, RegisterBody } from '../validations/authValidation'

const INVALID_CREDENTIALS = 'Invalid email or password'

function isDuplicateEmailError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const err = error as { code?: number; keyPattern?: Record<string, unknown> }
  return err.code === 11000 && Boolean(err.keyPattern?.email)
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
  const user = await User.findOne({ email: input.email }).select('+passwordHash')

  if (!user?.passwordHash) {
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

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId)

  if (!user) {
    throw new AppError(401, 'Unauthorized')
  }

  return toPublicUser(user)
}
