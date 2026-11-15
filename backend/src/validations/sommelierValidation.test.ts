import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MESSAGE_MAX_LENGTH } from '../types/sommelier'
import { recommendationRequestSchema } from './sommelierValidation'

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
