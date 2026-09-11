import dotenv from 'dotenv'

dotenv.config()

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function parseCorsOrigins(value: string | undefined): string[] {
  const raw =
    value ?? 'http://127.0.0.1:5173,http://localhost:5173'
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  mongodbUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/whiskyhello'),
  jwtSecret: required('JWT_SECRET', 'change-me-in-development'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
}
