import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { NextFunction, Request, Response } from 'express'
import Joi from 'joi'
import { validate } from './validate'

const schema = Joi.object({ page: Joi.number().integer().default(1) })

describe('validate', () => {
  it('replaces a read-only query (Express 5) with the validated value', () => {
    const req = {} as Request
    Object.defineProperty(req, 'query', { get: () => ({ page: '2', extra: 'x' }), configurable: true })
    let passed = false

    validate(schema, 'query')(req, {} as Response, (() => {
      passed = true
    }) as NextFunction)

    assert.equal(passed, true)
    assert.deepEqual(req.query, { page: 2 })
  })

  it('answers 400 with the validation details and does not call next', () => {
    const req = { body: { page: 'x' } } as unknown as Request
    let status = 0
    let body: unknown
    const res = {
      status(code: number) {
        status = code
        return res
      },
      json(payload: unknown) {
        body = payload
        return res
      },
    } as unknown as Response
    let passed = false

    validate(schema)(req, res, (() => {
      passed = true
    }) as NextFunction)

    assert.equal(passed, false)
    assert.equal(status, 400)
    assert.deepEqual(body, { message: 'Validation failed', details: ['"page" must be a number'] })
  })
})
