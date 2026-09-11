import { User } from '../models/User'
import type { PublicUser } from '../types/user'
import { AppError } from '../utils/AppError'
import { hashPassword } from '../utils/password'
import { toPublicUser } from '../utils/toPublicUser'
import type { RegisterBody } from '../validations/authValidation'

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
