import dotenv from 'dotenv'

dotenv.config()

const WEAK_JWT_SECRETS = new Set([
  'change-me-in-development',
  'changeme',
  'secret',
  'jwt-secret',
])

function readNodeEnv(): string {
  return process.env.NODE_ENV ?? 'development'
}

function isProduction(nodeEnv: string): boolean {
  return nodeEnv === 'production'
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function resolveJwtSecret(nodeEnv: string): string {
  const value = process.env.JWT_SECRET?.trim()

  if (isProduction(nodeEnv)) {
    if (!value) {
      throw new Error(
        'Missing required environment variable: JWT_SECRET (required in production)',
      )
    }
    if (WEAK_JWT_SECRETS.has(value) || value.length < 16) {
      throw new Error(
        'JWT_SECRET is too weak for production. Use a long, random secret.',
      )
    }
    return value
  }

  return required('JWT_SECRET', 'change-me-in-development')
}

function parseCorsOrigins(value: string | undefined): string[] {
  const raw =
    value ?? 'http://127.0.0.1:5173,http://localhost:5173'
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

const nodeEnv = readNodeEnv()

export const env = {
  port: Number(process.env.PORT ?? 3000),
  mongodbUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/whiskyhello'),
  jwtSecret: resolveJwtSecret(nodeEnv),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  nodeEnv,
  isProduction: isProduction(nodeEnv),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  /** Enable Express trust proxy (first hop) when behind a reverse proxy. */
  trustProxy:
    process.env.TRUST_PROXY === '1' ||
    process.env.TRUST_PROXY?.toLowerCase() === 'true',
}
