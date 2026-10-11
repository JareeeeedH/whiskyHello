import { NextFunction, Request, Response } from 'express'
import { env } from '../config/env'
import { clientKey } from './rateLimit'

export const SOMMELIER_QUOTA_CODES = {
  guest: 'SOMMELIER_GUEST_LIMIT',
  member: 'SOMMELIER_MEMBER_LIMIT',
  site: 'SOMMELIER_SITE_LIMIT',
} as const

type DailyQuotaOptions = {
  /** Per IP address for visitors who are not logged in. */
  guestMax: number
  /** Per account for logged-in members. */
  memberMax: number
  /** Everyone together. */
  siteMax: number
  now?: () => Date
}

const SITE_KEY = 'site'

const taipeiDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Calendar day in Taiwan, so every count resets at 00:00 Asia/Taipei. */
export function taipeiDay(date: Date): string {
  return taipeiDateFormat.format(date)
}

/**
 * Daily recommendation quota. Only requests answered with 200 (including `unable`) use it up;
 * validation errors, OpenAI failures and timeouts are given back.
 * Counts live in memory, so a server restart clears them.
 */
export function dailyRecommendationQuota(options: DailyQuotaOptions) {
  const counts = new Map<string, number>()
  let day = ''

  function add(key: string, amount: number) {
    counts.set(key, (counts.get(key) ?? 0) + amount)
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const today = taipeiDay(options.now?.() ?? new Date())
    if (today !== day) {
      day = today
      counts.clear()
    }

    const member = req.user?.userId
    const ownKey = member ? `user:${member}` : `ip:${clientKey(req)}`
    const ownMax = member ? options.memberMax : options.guestMax

    if ((counts.get(ownKey) ?? 0) >= ownMax) {
      res.status(429).json(
        member
          ? {
              message: 'Daily recommendation limit reached, please try again tomorrow',
              code: SOMMELIER_QUOTA_CODES.member,
            }
          : {
              message: 'Free recommendation limit reached, please log in',
              code: SOMMELIER_QUOTA_CODES.guest,
            },
      )
      return
    }

    if ((counts.get(SITE_KEY) ?? 0) >= options.siteMax) {
      res.status(429).json({
        message: 'Recommendations are fully booked today, please try again tomorrow',
        code: SOMMELIER_QUOTA_CODES.site,
      })
      return
    }

    // Reserve up front so parallel requests cannot overshoot the limit.
    add(ownKey, 1)
    add(SITE_KEY, 1)
    const reservedDay = day
    res.once('close', () => {
      const succeeded = res.writableFinished && res.statusCode === 200
      if (!succeeded && day === reservedDay) {
        add(ownKey, -1)
        add(SITE_KEY, -1)
      }
    })
    next()
  }
}

export const sommelierDailyQuota = dailyRecommendationQuota({
  guestMax: env.isProduction ? 2 : 100,
  memberMax: env.isProduction ? 20 : 100,
  siteMax: env.isProduction ? 300 : 1000,
})
