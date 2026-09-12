import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Request } from 'express'
import { clientKey } from './rateLimit'

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
