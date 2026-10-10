import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { OCCASIONS, STYLE_KEYS, TASTE_KEYS, TASTE_PICKS_MAX, TASTE_PICKS_MIN } from '../types/sommelier'
import {
  FREE_TEXT_MAX_LENGTH,
  recommendationRequestSchema,
} from './sommelierValidation'

/** 4 picks across both groups. */
const taste = { fruit: 9, floral: 6, maltGrain: 7, peat: 2 }
const style = Object.fromEntries(STYLE_KEYS.map((key) => [key, 5]))

function body(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { taste, style, ...overrides }
}

/** Validates the way the route middleware does. */
function validateLikeRoute(input: unknown) {
  return recommendationRequestSchema.validate(input, { abortEarly: false, stripUnknown: true })
}

describe('recommendationRequestSchema', () => {
  it('has the 10 taste keys, picking 3–5 in total', () => {
    assert.deepEqual(TASTE_KEYS, [
      'fruit',
      'sweet',
      'floral',
      'maltGrain',
      'nutty',
      'chocolateCoffee',
      'spice',
      'oak',
      'peat',
      'smoke',
    ])
    assert.equal(TASTE_PICKS_MIN, 3)
    assert.equal(TASTE_PICKS_MAX, 5)
  })

  it('accepts 3, 4 or 5 rated tastes from either group and 3 style ratings', () => {
    for (const picked of [
      { fruit: 9, sweet: 6, floral: 3 },
      taste,
      { peat: 10, smoke: 9, oak: 4, spice: 1, chocolateCoffee: 5 },
    ]) {
      const { error, value } = validateLikeRoute(body({ taste: picked }))
      assert.equal(error, undefined)
      assert.deepEqual(value, { taste: picked, style })
    }
  })

  it('keeps unpicked tastes absent instead of filling them in', () => {
    const { value } = validateLikeRoute(body())
    assert.equal('sweet' in value.taste, false)
    assert.equal('oak' in value.taste, false)
  })

  it('rejects unknown and retired taste keys even when the route strips unknown fields', () => {
    for (const key of ['driedFruit', 'citrus', 'vanillaCaramel', 'salty']) {
      const { error } = validateLikeRoute(body({ taste: { ...taste, [key]: 5 } }))
      assert.ok(error, key)
      assert.ok(error.details.some((detail) => detail.message.includes('not a supported flavor')), key)
    }
  })

  it('accepts a full input and trims freeText', () => {
    const { error, value } = recommendationRequestSchema.validate(
      body({ budget: { max: 3000 }, freeText: '  想找適合晚上慢慢喝的酒  ' }),
    )
    assert.equal(error, undefined)
    assert.deepEqual(value.budget, { max: 3000 })
    assert.equal(value.freeText, '想找適合晚上慢慢喝的酒')
  })

  it('accepts ratings at the 1 and 10 boundaries', () => {
    for (const rating of [1, 10]) {
      const { error } = recommendationRequestSchema.validate(
        body({
          taste: { ...taste, fruit: rating, peat: rating },
          style: { ...style, body: rating },
        }),
      )
      assert.equal(error, undefined)
    }
  })

  it('accepts each of the 7 occasions, and no occasion at all', () => {
    assert.deepEqual(OCCASIONS, ['relaxing', 'tasting', 'social', 'meal', 'date', 'gift', 'celebration'])
    for (const occasion of OCCASIONS) {
      const { error, value } = validateLikeRoute(body({ occasion }))
      assert.equal(error, undefined, occasion)
      assert.equal(value.occasion, occasion)
    }
    const { error, value } = validateLikeRoute(body())
    assert.equal(error, undefined)
    assert.equal('occasion' in value, false)
  })

  it('keeps budget min and max as before', () => {
    const { error, value } = recommendationRequestSchema.validate(body({ budget: { min: 1000, max: 3000 } }))
    assert.equal(error, undefined)
    assert.deepEqual(value.budget, { min: 1000, max: 3000 })
  })

  it('strips unknown fields, including legacy ones', () => {
    const { error, value } = recommendationRequestSchema.validate(
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
    ['no tastes', body({ taste: {} })],
    ['1 taste', body({ taste: { fruit: 9 } })],
    ['2 tastes', body({ taste: { fruit: 9, peat: 2 } })],
    ['6 tastes', body({ taste: { ...taste, oak: 5, smoke: 5 } })],
    ['all 10 tastes', body({
      taste: {
        fruit: 5, sweet: 5, floral: 5, maltGrain: 5, nutty: 5,
        chocolateCoffee: 5, spice: 5, oak: 5, peat: 5, smoke: 5,
      },
    })],
    ['a retired taste key', body({ taste: { fruit: 9, citrus: 6, sweet: 5 } })],
    ['a picked taste without a rating', body({ taste: { ...taste, oak: null } })],
    ...STYLE_KEYS.map((key): [string, unknown] => {
      const { [key]: _omitted, ...rest } = style
      return [`style missing ${key}`, body({ style: rest })]
    }),
    ['taste rating 0', body({ taste: { ...taste, peat: 0 } })],
    ['taste rating 11', body({ taste: { ...taste, fruit: 11 } })],
    ['taste rating with decimals', body({ taste: { ...taste, floral: 5.5 } })],
    ['taste rating on the old 0–100 scale', body({ taste: { ...taste, maltGrain: 65 } })],
    ['taste rating as a string', body({ taste: { ...taste, fruit: '5' } })],
    ['style rating 0', body({ style: { ...style, body: 0 } })],
    ['style rating 11', body({ style: { ...style, intensity: 11 } })],
    ['style rating with decimals', body({ style: { ...style, smoothness: 7.5 } })],
    ['style rating as a string', body({ style: { ...style, body: 'heavy' } })],
    ['an unknown occasion', body({ occasion: 'party' })],
    ['a retired occasion', body({ occasion: 'beginner' })],
    ['an empty occasion', body({ occasion: '' })],
    ['a non-string occasion', body({ occasion: 1 })],
    ['negative budget', body({ budget: { min: -1 } })],
    ['non-numeric budget', body({ budget: { max: 'cheap' } })],
    ['non-string freeText', body({ freeText: 123 })],
    ['freeText over the length limit', body({ freeText: 'a'.repeat(FREE_TEXT_MAX_LENGTH + 1) })],
  ]

  for (const [name, invalid] of invalidBodies) {
    it(`rejects ${name}`, () => {
      const { error } = validateLikeRoute(invalid)
      assert.ok(error)
    })
  }
})
