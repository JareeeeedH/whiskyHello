import mongoose from 'mongoose'
import '../config/env'

/**
 * Integration tests must use a dedicated database from TEST_MONGODB_URI.
 * There is no fallback to MONGODB_URI so tests can never touch the dev/prod database.
 */
export function resolveTestMongoUri(): string {
  const uri = process.env.TEST_MONGODB_URI?.trim()
  if (!uri) {
    throw new Error(
      'TEST_MONGODB_URI is not set. Integration tests require a dedicated test database (see backend/.env.example).',
    )
  }

  if (uri === process.env.MONGODB_URI?.trim()) {
    throw new Error('TEST_MONGODB_URI must not be the same as MONGODB_URI.')
  }

  const dbName = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/)?.[1] ?? ''
  if (!/test/i.test(dbName)) {
    throw new Error(
      'TEST_MONGODB_URI must include a database name containing "test" (e.g. /whiskyhello_test).',
    )
  }

  return uri
}

export async function connectTestDatabase(): Promise<void> {
  await mongoose.connect(resolveTestMongoUri(), {
    serverSelectionTimeoutMS: 5000,
  })
}

export async function disconnectTestDatabase(): Promise<void> {
  await mongoose.disconnect()
}
