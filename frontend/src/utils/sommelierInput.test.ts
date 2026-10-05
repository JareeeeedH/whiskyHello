import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SommelierInputDraft } from '../types/sommelier.ts'
import {
  BUDGET_MAX,
  BUDGET_MIN,
  FLAVOR_TAGS,
  TASTE_CHOICES,
  createEmptySommelierDraft,
  validateSommelierInput,
} from './sommelierInput.ts'

function draft(overrides: Partial<SommelierInputDraft> = {}): SommelierInputDraft {
  return { ...createEmptySommelierDraft(), taste: ['sweet'], ...overrides }
}

describe('sommelier step 1 options', () => {
  it('keeps all spec flavor tags for extraction', () => {
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
  })

  it('offers only the six Q1 flavor chips in order', () => {
    assert.deepEqual(TASTE_CHOICES, ['sweet', 'fruity', 'floral', 'vanilla', 'woody', 'spicy'])
  })

  it('starts with zero intensity, a NT$ 2,000 budget and no free text', () => {
    assert.deepEqual(createEmptySommelierDraft(), {
      taste: [],
      peaty: 0,
      smoky: 0,
      budget: 2000,
      freeText: '',
    })
  })
})

describe('validateSommelierInput', () => {
  it('always sends the displayed intensity and budget, even untouched', () => {
    assert.deepEqual(validateSommelierInput(draft()), {
      ok: true,
      value: {
        taste: ['sweet'],
        intensity: { peaty: 0, smoky: 0 },
        budget: { max: 2000 },
      },
    })
  })

  it('normalizes a fully answered conversation without legacy fields', () => {
    const result = validateSommelierInput(
      draft({
        taste: ['fruity', 'vanilla'],
        peaty: 0,
        smoky: 30,
        budget: 3500,
        freeText: '  今晚和女朋友約會，想喝舒服一點，不要太重  ',
      }),
    )

    assert.deepEqual(result, {
      ok: true,
      value: {
        taste: ['fruity', 'vanilla'],
        intensity: { peaty: 0, smoky: 30 },
        budget: { max: 3500 },
        freeText: '今晚和女朋友約會，想喝舒服一點，不要太重',
      },
    })
    if (result.ok) {
      assert.equal('dislikes' in result.value, false)
      assert.equal('occasion' in result.value, false)
    }
  })

  it('requires at least one flavor', () => {
    const result = validateSommelierInput(draft({ taste: [] }))

    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.ok(result.errors.taste)
    }
  })

  it('removes duplicate tags while keeping first-seen order', () => {
    const result = validateSommelierInput(draft({ taste: ['woody', 'sweet', 'woody'] }))

    assert.equal(result.ok, true)
    if (result.ok) {
      assert.deepEqual(result.value.taste, ['woody', 'sweet'])
    }
  })

  it('rejects unknown tags and tags not offered in Q1', () => {
    for (const tag of ['salty', 'smoky', 'peaty', 'maritime']) {
      const result = validateSommelierInput(draft({ taste: ['sweet', tag] }))
      assert.equal(result.ok, false)
      if (!result.ok) {
        assert.ok(result.errors.taste)
      }
    }
  })

  it('rejects taste that is not an array', () => {
    const result = validateSommelierInput(draft({ taste: 'sweet' as unknown as string[] }))

    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.ok(result.errors.taste)
    }
  })

  it('accepts intensity at the 0 and 100 boundaries', () => {
    const result = validateSommelierInput(draft({ peaty: 0, smoky: 100 }))

    assert.deepEqual(result.ok && result.value.intensity, { peaty: 0, smoky: 100 })
  })

  for (const invalid of [-1, 101, 12.5, Number.NaN, '50' as unknown as number]) {
    it(`rejects intensity value ${String(invalid)}`, () => {
      const asPeaty = validateSommelierInput(draft({ peaty: invalid }))
      const asSmoky = validateSommelierInput(draft({ smoky: invalid }))

      assert.equal(asPeaty.ok, false)
      assert.equal(asSmoky.ok, false)
      if (!asPeaty.ok) assert.ok(asPeaty.errors.intensity)
      if (!asSmoky.ok) assert.ok(asSmoky.errors.intensity)
    })
  }

  it('maps the budget slider to a max-only budget, including its boundaries', () => {
    for (const budget of [BUDGET_MIN, 2000, 3500, BUDGET_MAX]) {
      const result = validateSommelierInput(draft({ budget }))
      assert.deepEqual(result.ok && result.value.budget, { max: budget })
    }
  })

  for (const invalid of [900, 6100, 2500.5, Number.POSITIVE_INFINITY, '3000' as unknown as number]) {
    it(`rejects budget value ${String(invalid)}`, () => {
      const result = validateSommelierInput(draft({ budget: invalid }))

      assert.equal(result.ok, false)
      if (!result.ok) assert.ok(result.errors.budget)
    })
  }

  it('omits freeText when skipped or whitespace-only', () => {
    for (const freeText of ['', ' \n\t ']) {
      const result = validateSommelierInput(draft({ freeText }))

      assert.equal(result.ok, true)
      if (result.ok) {
        assert.equal('freeText' in result.value, false)
      }
    }
  })
})
