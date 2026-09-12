import { OAuth2Client, type TokenPayload } from 'google-auth-library'
import { env } from '../config/env'
import { AppError } from '../utils/AppError'

const GOOGLE_ISSUERS = new Set([
  'https://accounts.google.com',
  'accounts.google.com',
])

export type GoogleIdentity = {
  sub: string
  email: string
  emailVerified: boolean
  name: string
  picture: string
}

/**
 * Maps a verified Google ID token payload into app identity fields.
 * Exported for unit tests (audience / issuer / required claims).
 */
export function buildGoogleIdentityFromPayload(
  payload: TokenPayload,
  expectedAudience: string,
): GoogleIdentity {
  if (!payload.iss || !GOOGLE_ISSUERS.has(payload.iss)) {
    throw new AppError(401, 'Invalid Google credential')
  }

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!audiences.includes(expectedAudience)) {
    throw new AppError(401, 'Invalid Google credential')
  }

  if (!payload.sub) {
    throw new AppError(401, 'Invalid Google credential')
  }

  if (!payload.email) {
    throw new AppError(400, 'Google account email is required')
  }

  if (payload.email_verified !== true) {
    throw new AppError(401, 'Google email is not verified')
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase().trim(),
    emailVerified: true,
    name: (
      payload.name ??
      payload.email.split('@')[0] ??
      'WhiskyHello User'
    ).trim(),
    picture: typeof payload.picture === 'string' ? payload.picture : '',
  }
}

/**
 * Verifies a Google Identity Services ID token (JWT credential).
 * Mock this boundary in service tests — do not call Google from unit tests.
 */
export async function verifyGoogleIdToken(
  credential: string,
): Promise<GoogleIdentity> {
  if (!env.googleClientId) {
    throw new AppError(503, 'Google Sign-In is not configured')
  }

  const client = new OAuth2Client(env.googleClientId)

  let payload: TokenPayload | undefined
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    })
    payload = ticket.getPayload()
  } catch {
    throw new AppError(401, 'Invalid Google credential')
  }

  if (!payload) {
    throw new AppError(401, 'Invalid Google credential')
  }

  return buildGoogleIdentityFromPayload(payload, env.googleClientId)
}
