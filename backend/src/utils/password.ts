import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

const SCRYPT_KEYLEN = 64
const SALT_BYTES = 16

/**
 * Hash a password with Node.js crypto.scrypt.
 * Stored format: scrypt$<saltHex>$<hashHex>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const derived = (await scrypt(password, salt, SCRYPT_KEYLEN)) as Buffer
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`
}

/** Verify a password against a stored scrypt hash (for future login). */
export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const parts = passwordHash.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false
  }

  const [, saltHex, hashHex] = parts
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const actual = (await scrypt(password, salt, expected.length)) as Buffer

  if (actual.length !== expected.length) {
    return false
  }

  return timingSafeEqual(actual, expected)
}
