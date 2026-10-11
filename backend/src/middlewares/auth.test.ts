import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { optionalAuthenticate } from './auth'

function run(authorization?: string): { status: number; passed: boolean; userId?: string } {
  let status = 200
  let passed = false
  const req = { headers: authorization ? { authorization } : {} } as Request
  const res = {
    status(code: number) {
      status = code
      return res
    },
    json: () => res,
  } as unknown as Response

  optionalAuthenticate(req, res, (() => {
    passed = true
  }) as NextFunction)
  return { status, passed, userId: req.user?.userId }
}

describe('optionalAuthenticate', () => {
  it('lets guests through without a user', () => {
    assert.deepEqual(run(), { status: 200, passed: true, userId: undefined })
  })

  it('attaches the member when a valid token is sent', () => {
    const token = jwt.sign({ userId: 'u1' }, env.jwtSecret)
    assert.deepEqual(run(`Bearer ${token}`), { status: 200, passed: true, userId: 'u1' })
  })

  it('rejects an invalid token instead of treating it as a guest', () => {
    assert.deepEqual(run('Bearer not-a-token'), { status: 401, passed: false, userId: undefined })
  })
})
