import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import { errorHandler } from './errorHandler'
import { AppError } from '../utils/AppError'

type MockRes = Response & {
  statusCode: number
  body: unknown
}

function createMockRes(): MockRes {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
  return res as MockRes
}

describe('errorHandler', () => {
  it('maps AppError to its status and body', () => {
    const res = createMockRes()
    errorHandler(
      new AppError(403, 'Forbidden', ['nope']),
      {} as Request,
      res,
      (() => undefined) as NextFunction,
    )
    assert.equal(res.statusCode, 403)
    assert.deepEqual(res.body, { message: 'Forbidden', details: ['nope'] })
  })

  it('maps Mongoose CastError to 400', () => {
    const res = createMockRes()
    const err = new mongoose.Error.CastError('ObjectId', 'bad-id', '_id')
    errorHandler(err, {} as Request, res, (() => undefined) as NextFunction)
    assert.equal(res.statusCode, 400)
    assert.equal((res.body as { message: string }).message, 'Invalid id')
    assert.ok(Array.isArray((res.body as { details: string[] }).details))
  })

  it('maps Mongoose ValidationError to 400', () => {
    const res = createMockRes()
    const err = new mongoose.Error.ValidationError()
    err.addError(
      'rating',
      new mongoose.Error.ValidatorError({
        message: 'Rating is required',
        path: 'rating',
      }),
    )
    errorHandler(err, {} as Request, res, (() => undefined) as NextFunction)
    assert.equal(res.statusCode, 400)
    assert.equal((res.body as { message: string }).message, 'Validation failed')
    assert.deepEqual((res.body as { details: string[] }).details, [
      'Rating is required',
    ])
  })
})
