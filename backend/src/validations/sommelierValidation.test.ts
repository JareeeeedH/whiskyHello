import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  FREE_TEXT_MAX_LENGTH,
  preferenceRequestSchema,
} from './sommelierValidation'

describe('preferenceRequestSchema', () => {
  it('accepts the minimal Step 1 input', () => {
    const { error, value } = preferenceRequestSchema.validate({
      taste: [],
      dislikes: [],
    })
    assert.equal(error, undefined)
    assert.deepEqual(value, { taste: [], dislikes: [] })
  })

  it('accepts a full Step 1 input and trims freeText', () => {
    const { error, value } = preferenceRequestSchema.validate({
      taste: ['fruity', 'vanilla'],
      dislikes: ['peaty'],
      budget: { min: 1000, max: 3000 },
      occasion: 'relaxing',
      freeText: '  想找適合晚上慢慢喝的酒  ',
    })
    assert.equal(error, undefined)
    assert.equal(value.freeText, '想找適合晚上慢慢喝的酒')
  })

  it('strips unknown fields', () => {
    const { error, value } = preferenceRequestSchema.validate(
      { taste: [], dislikes: [], mood: 'positive' },
      { stripUnknown: true },
    )
    assert.equal(error, undefined)
    assert.equal('mood' in value, false)
  })

  const invalidBodies: Array<[string, unknown]> = [
    ['missing taste', { dislikes: [] }],
    ['missing dislikes', { taste: [] }],
    ['taste not an array', { taste: 'sweet', dislikes: [] }],
    ['unknown flavor tag', { taste: ['salty'], dislikes: [] }],
    ['duplicate tags', { taste: ['sweet', 'sweet'], dislikes: [] }],
    ['negative budget', { taste: [], dislikes: [], budget: { min: -1 } }],
    ['non-numeric budget', { taste: [], dislikes: [], budget: { max: 'cheap' } }],
    ['date occasion from Step 1', { taste: [], dislikes: [], occasion: 'date' }],
    ['unknown occasion', { taste: [], dislikes: [], occasion: 'party' }],
    ['non-string freeText', { taste: [], dislikes: [], freeText: 123 }],
    [
      'freeText over the length limit',
      { taste: [], dislikes: [], freeText: 'a'.repeat(FREE_TEXT_MAX_LENGTH + 1) },
    ],
  ]

  for (const [name, body] of invalidBodies) {
    it(`rejects ${name}`, () => {
      const { error } = preferenceRequestSchema.validate(body, { abortEarly: false })
      assert.ok(error)
    })
  }
})
