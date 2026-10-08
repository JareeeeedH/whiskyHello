import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { STYLE_KEYS } from '../types/sommelier'
import {
  FREE_TEXT_MAX_LENGTH,
  preferenceRequestSchema,
} from './sommelierValidation'

/** 3 picks from the first group and 3 from the second. */
const taste = { sweet: 8, fruit: 9, floral: 6, chocolateCoffee: 8, peat: 2, smoke: 1 }
const style = Object.fromEntries(STYLE_KEYS.map((key) => [key, 5]))

function body(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { taste, style, ...overrides }
}

describe('preferenceRequestSchema', () => {
  it('accepts 3 rated tastes per group and 3 style ratings', () => {
    const { error, value } = preferenceRequestSchema.validate(body())
    assert.equal(error, undefined)
    assert.deepEqual(value, { taste, style })
  })

  it('keeps unpicked tastes absent instead of filling them in', () => {
    const { value } = preferenceRequestSchema.validate(body())
    assert.equal('driedFruit' in value.taste, false)
    assert.equal('oak' in value.taste, false)
  })

  it('accepts a full input and trims freeText', () => {
    const { error, value } = preferenceRequestSchema.validate(
      body({ budget: { max: 3000 }, freeText: '  想找適合晚上慢慢喝的酒  ' }),
    )
    assert.equal(error, undefined)
    assert.deepEqual(value.budget, { max: 3000 })
    assert.equal(value.freeText, '想找適合晚上慢慢喝的酒')
  })

  it('accepts ratings at the 1 and 10 boundaries', () => {
    for (const rating of [1, 10]) {
      const { error } = preferenceRequestSchema.validate(
        body({
          taste: { ...taste, sweet: rating, smoke: rating },
          style: { ...style, body: rating },
        }),
      )
      assert.equal(error, undefined)
    }
  })

  it('keeps budget min and max as before', () => {
    const { error, value } = preferenceRequestSchema.validate(body({ budget: { min: 1000, max: 3000 } }))
    assert.equal(error, undefined)
    assert.deepEqual(value.budget, { min: 1000, max: 3000 })
  })

  it('strips unknown fields, including legacy ones', () => {
    const { error, value } = preferenceRequestSchema.validate(
      body({ dislikes: ['peaty'], intensity: { peaty: 50 }, mood: 'positive' }),
      { stripUnknown: true },
    )
    assert.equal(error, undefined)
    assert.deepEqual(Object.keys(value), ['taste', 'style'])
  })

  const invalidBodies: Array<[string, unknown]> = [
    ['missing taste', { style }],
    ['missing style', { taste }],
    ['legacy taste array', body({ taste: ['sweet'] })],
    ['style not an object', body({ style: 5 })],
    ['only 2 tastes from the first group', body({ taste: { fruit: 9, floral: 6, chocolateCoffee: 8, peat: 2, smoke: 1 } })],
    ['4 tastes from the first group', body({ taste: { ...taste, citrus: 5 } })],
    ['4 tastes from the second group', body({ taste: { ...taste, oak: 5 } })],
    ['all 12 tastes', body({
      taste: {
        sweet: 5, fruit: 5, driedFruit: 5, citrus: 5, floral: 5, vanillaCaramel: 5,
        nutty: 5, chocolateCoffee: 5, spice: 5, oak: 5, peat: 5, smoke: 5,
      },
    })],
    ['no tastes', body({ taste: {} })],
    ...STYLE_KEYS.map((key): [string, unknown] => {
      const { [key]: _omitted, ...rest } = style
      return [`style missing ${key}`, body({ style: rest })]
    }),
    ['taste rating 0', body({ taste: { ...taste, peat: 0 } })],
    ['taste rating 11', body({ taste: { ...taste, sweet: 11 } })],
    ['taste rating with decimals', body({ taste: { ...taste, floral: 5.5 } })],
    ['taste rating on the old 0–100 scale', body({ taste: { ...taste, smoke: 65 } })],
    ['taste rating as a string', body({ taste: { ...taste, fruit: '5' } })],
    ['style rating 0', body({ style: { ...style, body: 0 } })],
    ['style rating 11', body({ style: { ...style, intensity: 11 } })],
    ['style rating with decimals', body({ style: { ...style, smoothness: 7.5 } })],
    ['style rating as a string', body({ style: { ...style, body: 'heavy' } })],
    ['negative budget', body({ budget: { min: -1 } })],
    ['non-numeric budget', body({ budget: { max: 'cheap' } })],
    ['non-string freeText', body({ freeText: 123 })],
    ['freeText over the length limit', body({ freeText: 'a'.repeat(FREE_TEXT_MAX_LENGTH + 1) })],
  ]

  for (const [name, invalid] of invalidBodies) {
    it(`rejects ${name}`, () => {
      const { error } = preferenceRequestSchema.validate(invalid, { abortEarly: false })
      assert.ok(error)
    })
  }
})
