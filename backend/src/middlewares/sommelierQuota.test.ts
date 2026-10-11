import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { describe, it } from 'node:test'
import type { NextFunction, Request, Response } from 'express'
import { SOMMELIER_QUOTA_CODES, dailyRecommendationQuota, taipeiDay } from './sommelierQuota'

type Quota = ReturnType<typeof dailyRecommendationQuota>

type Caller = { ip?: string; userId?: string }

/** Runs one request through the quota; the controller then answers with `finalStatus`. */
function hit(quota: Quota, caller: Caller, finalStatus = 200): { status: number; code?: string } {
  let status = 200
  let body: { code?: string } = {}
  let passed = false
  const res = Object.assign(new EventEmitter(), {
    statusCode: 200,
    writableFinished: false,
    status(code: number) {
      status = code
      return res
    },
    json(payload: { code?: string }) {
      body = payload
      return res
    },
  })
  const req = {
    ip: caller.ip ?? '10.0.0.1',
    socket: {},
    user: caller.userId ? { userId: caller.userId } : undefined,
  } as unknown as Request

  quota(req, res as unknown as Response, (() => {
    passed = true
  }) as NextFunction)

  if (passed) {
    res.statusCode = finalStatus
    res.writableFinished = true
    res.emit('close')
    return { status: finalStatus }
  }
  return { status, code: body.code }
}

function createQuota(now = () => new Date('2026-10-11T04:00:00Z')) {
  return dailyRecommendationQuota({ guestMax: 2, memberMax: 3, siteMax: 6, now })
}

describe('dailyRecommendationQuota', () => {
  it('lets a guest IP recommend twice a day, then asks them to log in', () => {
    const quota = createQuota()

    assert.equal(hit(quota, {}).status, 200)
    assert.equal(hit(quota, {}).status, 200)
    assert.deepEqual(hit(quota, {}), { status: 429, code: SOMMELIER_QUOTA_CODES.guest })
    assert.equal(hit(quota, { ip: '10.0.0.2' }).status, 200)
  })

  it('counts members per account, not per IP', () => {
    const quota = createQuota()

    hit(quota, {})
    hit(quota, {})
    assert.equal(hit(quota, { userId: 'u1' }).status, 200)
    assert.equal(hit(quota, { userId: 'u1', ip: '10.0.0.9' }).status, 200)
    assert.equal(hit(quota, { userId: 'u1' }).status, 200)
    assert.deepEqual(hit(quota, { userId: 'u1' }), { status: 429, code: SOMMELIER_QUOTA_CODES.member })
  })

  it('gives the use back when the recommendation fails', () => {
    const quota = createQuota()

    assert.equal(hit(quota, {}, 502).status, 502)
    assert.equal(hit(quota, {}, 504).status, 504)
    assert.equal(hit(quota, {}).status, 200)
    assert.equal(hit(quota, {}).status, 200)
    assert.equal(hit(quota, {}).code, SOMMELIER_QUOTA_CODES.guest)
  })

  it('stops everyone once the site-wide daily total is reached', () => {
    const quota = createQuota()

    for (const ip of ['1', '2', '3']) {
      hit(quota, { ip })
      hit(quota, { ip })
    }
    assert.deepEqual(hit(quota, { userId: 'u1' }), { status: 429, code: SOMMELIER_QUOTA_CODES.site })
  })

  it('resets at midnight Taiwan time', () => {
    let now = new Date('2026-10-11T15:59:00Z')
    const quota = createQuota(() => now)

    hit(quota, {})
    hit(quota, {})
    assert.equal(hit(quota, {}).code, SOMMELIER_QUOTA_CODES.guest)

    now = new Date('2026-10-11T16:00:00Z')
    assert.equal(hit(quota, {}).status, 200)
  })
})

describe('taipeiDay', () => {
  it('uses the Taiwan calendar date', () => {
    assert.equal(taipeiDay(new Date('2026-10-11T15:59:59Z')), '2026-10-11')
    assert.equal(taipeiDay(new Date('2026-10-11T16:00:00Z')), '2026-10-12')
  })
})
