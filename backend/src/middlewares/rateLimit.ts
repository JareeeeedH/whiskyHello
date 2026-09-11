import { NextFunction, Request, Response } from 'express'
import { env } from '../config/env'

type RateLimitOptions = {
  windowMs: number
  max: number
  message?: string
}

type Bucket = {
  count: number
  resetAt: number
}

function clientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return req.ip || req.socket.remoteAddress || 'unknown'
}

/**
 * Lightweight fixed-window rate limiter (no external dependency).
 * Suitable for single-process development / small deployments.
 */
export function rateLimit(options: RateLimitOptions) {
  const buckets = new Map<string, Bucket>()
  const message =
    options.message ?? 'Too many authentication attempts, please try again later'

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now()
    const key = `${req.method}:${req.path}:${clientKey(req)}`
    const existing = buckets.get(key)

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs })
      next()
      return
    }

    if (existing.count >= options.max) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      )
      res.setHeader('Retry-After', String(retryAfterSec))
      res.status(429).json({ message })
      return
    }

    existing.count += 1
    next()
  }
}

const defaultMax = env.isProduction ? 20 : 100
const configuredMax = Number(process.env.AUTH_RATE_LIMIT_MAX)
const authMax =
  Number.isFinite(configuredMax) && configuredMax > 0
    ? configuredMax
    : defaultMax

/** Auth endpoints: stricter in production, generous enough for local testing. */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: authMax,
  message: 'Too many authentication attempts, please try again later',
})
