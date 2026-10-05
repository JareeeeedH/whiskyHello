import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SommelierInputDraft } from '../types/sommelier.ts'
import {
  FLAVOR_TAGS,
  OCCASIONS,
  createEmptySommelierDraft,
  validateSommelierInput,
} from './sommelierInput.ts'

function draft(overrides: Partial<SommelierInputDraft> = {}): SommelierInputDraft {
  return { ...createEmptySommelierDraft(), ...overrides }
}

describe('sommelier step 1 options', () => {
  it('exposes the spec flavor tags and occasions in order', () => {
    assert.deepEqual(FLAVOR_TAGS, [
      'sweet',
      'fruity',
      'floral',
      'vanilla',
      'woody',
      'spicy',
      'smoky',
      'peaty',
      'maritime',
    ])
    assert.deepEqual(OCCASIONS, ['relaxing', 'social', 'meal', 'gift', 'beginner', 'premium'])
  })
})

describe('validateSommelierInput', () => {
  it('returns only empty taste and dislikes arrays for an empty form', () => {
    assert.deepEqual(validateSommelierInput(draft()), {
      ok: true,
      value: { taste: [], dislikes: [] },
    })
  })

  it('normalizes a fully filled form', () => {
    const result = validateSommelierInput(
      draft({
        taste: ['fruity', 'vanilla'],
        dislikes: ['peaty'],
        budgetMin: 1000,
        budgetMax: 3000,
        occasion: 'relaxing',
        freeText: '  想找適合晚上慢慢喝、不要太烈的酒  ',
      }),
    )

    assert.deepEqual(result, {
      ok: true,
      value: {
        taste: ['fruity', 'vanilla'],
        dislikes: ['peaty'],
        budget: { min: 1000, max: 3000 },
        occasion: 'relaxing',
        freeText: '想找適合晚上慢慢喝、不要太烈的酒',
      },
    })
  })

  it('removes duplicate tags while keeping first-seen order', () => {
    const result = validateSommelierInput(
      draft({ taste: ['smoky', 'sweet', 'smoky'], dislikes: ['floral', 'floral'] }),
    )

    assert.equal(result.ok, true)
    if (result.ok) {
      assert.deepEqual(result.value.taste, ['smoky', 'sweet'])
      assert.deepEqual(result.value.dislikes, ['floral'])
    }
  })

  it('rejects unknown taste and dislike tags', () => {
    const result = validateSommelierInput(draft({ taste: ['sweet', 'salty'], dislikes: ['umami'] }))

    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.ok(result.errors.taste)
      assert.ok(result.errors.dislikes)
    }
  })

  it('rejects taste or dislikes that are not arrays', () => {
    const result = validateSommelierInput(
      draft({ taste: 'sweet' as unknown as string[], dislikes: null as unknown as string[] }),
    )

    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.ok(result.errors.taste)
      assert.ok(result.errors.dislikes)
    }
  })

  it('keeps a budget with only min or only max, including 0', () => {
    const onlyMin = validateSommelierInput(draft({ budgetMin: 0 }))
    const onlyMax = validateSommelierInput(draft({ budgetMax: 2000 }))

    assert.deepEqual(onlyMin.ok && onlyMin.value.budget, { min: 0 })
    assert.deepEqual(onlyMax.ok && onlyMax.value.budget, { max: 2000 })
  })

  it('omits budget when neither min nor max is provided', () => {
    const result = validateSommelierInput(draft())

    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal('budget' in result.value, false)
    }
  })

  for (const invalid of [-1, Number.NaN, Number.POSITIVE_INFINITY, '100' as unknown as number]) {
    it(`rejects budget value ${String(invalid)}`, () => {
      const asMin = validateSommelierInput(draft({ budgetMin: invalid }))
      const asMax = validateSommelierInput(draft({ budgetMax: invalid }))

      assert.equal(asMin.ok, false)
      assert.equal(asMax.ok, false)
      if (!asMin.ok) assert.ok(asMin.errors.budget)
      if (!asMax.ok) assert.ok(asMax.errors.budget)
    })
  }

  it('rejects occasions outside the step 1 list, including date', () => {
    for (const occasion of ['party', 'date']) {
      const result = validateSommelierInput(draft({ occasion }))
      assert.equal(result.ok, false)
      if (!result.ok) {
        assert.ok(result.errors.occasion)
      }
    }
  })

  it('omits occasion when not selected', () => {
    const result = validateSommelierInput(draft({ occasion: null }))

    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal('occasion' in result.value, false)
    }
  })

  it('treats whitespace-only freeText as not provided', () => {
    const result = validateSommelierInput(draft({ freeText: ' \n\t ' }))

    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal('freeText' in result.value, false)
    }
  })
})
