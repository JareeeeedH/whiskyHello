import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { NextFunction, Request, Response } from 'express'
import { clientKey, rateLimit } from './rateLimit'

describe('rateLimit clientKey', () => {
  it('uses req.ip and ignores spoofed X-Forwarded-For', () => {
    const req = {
      ip: '10.0.0.5',
      headers: {
        'x-forwarded-for': '1.2.3.4, 5.6.7.8',
      },
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request

    assert.equal(clientKey(req), '10.0.0.5')
  })

  it('falls back to socket remoteAddress when ip is missing', () => {
    const req = {
      headers: {
        'x-forwarded-for': '9.9.9.9',
      },
      socket: { remoteAddress: '192.168.1.10' },
    } as unknown as Request

    assert.equal(clientKey(req), '192.168.1.10')
  })
})

describe('rateLimit scope', () => {
  function hit(
    limiter: ReturnType<typeof rateLimit>,
    path: string,
    ip = '10.0.0.1',
  ): number {
    let status = 200
    const req = { method: 'POST', path, ip, headers: {}, socket: {} } as unknown as Request
    const res = {
      setHeader: () => res,
      status: (code: number) => {
        status = code
        return res
      },
      json: () => res,
    } as unknown as Response
    limiter(req, res, (() => undefined) as NextFunction)
    return status
  }

  it('counts different paths together when they share a scope', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2, scope: 'email-code' })

    assert.equal(hit(limiter, '/register'), 200)
    assert.equal(hit(limiter, '/password/forgot'), 200)
    assert.equal(hit(limiter, '/register/resend'), 429)
    assert.equal(hit(limiter, '/register', '10.0.0.2'), 200)
  })

  it('counts each path separately without a scope', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 1 })

    assert.equal(hit(limiter, '/register'), 200)
    assert.equal(hit(limiter, '/password/forgot'), 200)
    assert.equal(hit(limiter, '/register'), 429)
  })
})
