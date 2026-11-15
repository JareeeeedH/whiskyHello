import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MESSAGE_MAX_LENGTH } from '../types/sommelier'
import { SOMMELIER_LOG_PAGE_MAX, recommendationRequestSchema, sommelierLogListQuerySchema } from './sommelierValidation'

/** Validates the way the route middleware does. */
function validateLikeRoute(input: unknown) {
  return recommendationRequestSchema.validate(input, { abortEarly: false, stripUnknown: true })
}

describe('recommendationRequestSchema', () => {
  it('accepts a message and trims it', () => {
    const { error, value } = validateLikeRoute({ message: '  想要煙燻味重一點的  ' })

    assert.equal(error, undefined)
    assert.deepEqual(value, { message: '想要煙燻味重一點的' })
  })

  it('accepts a message of exactly the maximum length', () => {
    const { error } = validateLikeRoute({ message: '甜'.repeat(MESSAGE_MAX_LENGTH) })

    assert.equal(error, undefined)
  })

  it('rejects a missing, blank, non-string or too long message', () => {
    const cases: [unknown, string][] = [
      [{}, 'Message is required'],
      [{ message: '' }, 'Message is required'],
      [{ message: '   ' }, 'Message is required'],
      [{ message: 42 }, 'Message must be a string'],
      [{ message: '甜'.repeat(MESSAGE_MAX_LENGTH + 1) }, `Message must be at most ${MESSAGE_MAX_LENGTH} characters`],
    ]
    for (const [input, message] of cases) {
      const { error } = validateLikeRoute(input)
      assert.ok(error, JSON.stringify(input))
      assert.deepEqual(error.details.map((detail) => detail.message), [message], JSON.stringify(input))
    }
  })

  it('strips the retired preference fields', () => {
    const { error, value } = validateLikeRoute({
      message: '花香',
      taste: { fruit: 9 },
      style: { body: 5 },
      occasion: 'date',
      budget: { max: 2000 },
    })

    assert.equal(error, undefined)
    assert.deepEqual(value, { message: '花香' })
  })
})

describe('sommelierLogListQuerySchema', () => {
  function validateQuery(input: unknown) {
    return sommelierLogListQuerySchema.validate(input, { abortEarly: false, stripUnknown: true })
  }

  it('defaults to the first page of 20 and turns query strings into numbers', () => {
    assert.deepEqual(validateQuery({}).value, { page: 1, limit: 20 })
    assert.deepEqual(validateQuery({ page: '3', limit: '50' }).value, { page: 3, limit: 50 })
  })

  it('rejects pages below 1 and limits outside 1–100', () => {
    for (const input of [{ page: '0' }, { limit: '0' }, { limit: String(SOMMELIER_LOG_PAGE_MAX + 1) }, { page: 'x' }]) {
      assert.ok(validateQuery(input).error, JSON.stringify(input))
    }
  })
})
