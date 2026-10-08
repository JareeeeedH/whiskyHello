import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SommelierInputDraft, TasteProfile } from '../types/sommelier.ts'
import {
  BUDGET_MAX,
  BUDGET_MIN,
  RATING_DEFAULT,
  RATING_MAX,
  RATING_MIN,
  STYLE_KEYS,
  STYLE_LABELS,
  TASTE_GROUPS,
  TASTE_KEYS,
  TASTE_LABELS,
  TASTE_PICKS_PER_GROUP,
  createEmptySommelierDraft,
  describeStyleRating,
  describeTasteRating,
  pickedTastes,
  toggleTastePick,
  validateSommelierInput,
} from './sommelierInput.ts'

const [GROUP_1 = [], GROUP_2 = []] = TASTE_GROUPS
const TASTE: TasteProfile = { sweet: 8, fruit: 9, floral: 6, chocolateCoffee: 8, peat: 2, smoke: 1 }
const STYLE = { body: 8, intensity: 6, smoothness: 9 }

function draft(overrides: Partial<SommelierInputDraft> = {}): SommelierInputDraft {
  return { ...createEmptySommelierDraft(), taste: { ...TASTE }, style: { ...STYLE }, ...overrides }
}

describe('sommelier preference dimensions', () => {
  it('has the 12 taste dimensions in order, with Chinese labels', () => {
    assert.deepEqual(TASTE_KEYS, [
      'sweet',
      'fruit',
      'driedFruit',
      'citrus',
      'floral',
      'vanillaCaramel',
      'nutty',
      'chocolateCoffee',
      'spice',
      'oak',
      'peat',
      'smoke',
    ])
    assert.deepEqual(Object.values(TASTE_LABELS), [
      '甜感',
      '水果',
      '果乾',
      '柑橘',
      '花香',
      '香草／焦糖',
      '堅果',
      '巧克力／咖啡',
      '香料',
      '橡木',
      '泥煤',
      '煙燻',
    ])
  })

  it('offers the tastes in two groups of six, picking 3 from each', () => {
    assert.deepEqual(TASTE_GROUPS, [
      ['sweet', 'fruit', 'driedFruit', 'citrus', 'floral', 'vanillaCaramel'],
      ['nutty', 'chocolateCoffee', 'spice', 'oak', 'peat', 'smoke'],
    ])
    assert.equal(TASTE_PICKS_PER_GROUP, 3)
  })

  it('has the 3 style dimensions', () => {
    assert.deepEqual(STYLE_KEYS, ['body', 'intensity', 'smoothness'])
    assert.deepEqual(Object.values(STYLE_LABELS), ['酒體', '風味強度', '順口度'])
  })

  it('rates on a 1–10 scale that starts at 5', () => {
    assert.equal(RATING_MIN, 1)
    assert.equal(RATING_MAX, 10)
    assert.equal(RATING_DEFAULT, 5)
  })

  it('starts with no tastes picked, style at 5, a NT$ 2,000 budget and no free text', () => {
    assert.deepEqual(createEmptySommelierDraft(), {
      taste: {},
      style: { body: 5, intensity: 5, smoothness: 5 },
      budget: 2000,
      freeText: '',
    })
  })

  it('returns a fresh draft each time', () => {
    const first = createEmptySommelierDraft()
    first.taste.sweet = 9
    first.style.body = 9
    assert.deepEqual(createEmptySommelierDraft().taste, {})
    assert.equal(createEmptySommelierDraft().style.body, 5)
  })
})

describe('rating words', () => {
  it('describes how much a taste is liked', () => {
    const words = Array.from({ length: 10 }, (_, index) => describeTasteRating(index + 1))
    assert.deepEqual(words, ['不太喜歡', '不太喜歡', '還好', '還好', '普通', '普通', '喜歡', '很喜歡', '很喜歡', '最愛'])
  })

  it('describes a style rating by the nearer end of its scale', () => {
    assert.equal(describeStyleRating('body', 1), '很輕盈')
    assert.equal(describeStyleRating('body', 4), '偏輕盈')
    assert.equal(describeStyleRating('body', 5), '適中')
    assert.equal(describeStyleRating('intensity', 7), '偏強烈')
    assert.equal(describeStyleRating('smoothness', 10), '很圓潤／順口')
  })
})

describe('taste picks', () => {
  it('starts a new pick at 5', () => {
    assert.deepEqual(toggleTastePick({}, GROUP_1, 'floral'), { floral: 5 })
  })

  it('removes the rating when a pick is undone', () => {
    assert.deepEqual(toggleTastePick({ sweet: 8, floral: 6 }, GROUP_1, 'sweet'), { floral: 6 })
  })

  it('ignores a fourth pick in the same group', () => {
    const full: TasteProfile = { sweet: 8, fruit: 9, floral: 6 }
    assert.equal(toggleTastePick(full, GROUP_1, 'citrus'), full)
  })

  it('counts picks per group, so a full first group does not block the second', () => {
    const full: TasteProfile = { sweet: 8, fruit: 9, floral: 6 }
    assert.deepEqual(toggleTastePick(full, GROUP_2, 'peat'), { ...full, peat: 5 })
  })

  it('lets a re-pick replace an undone one at 5, never keeping the old rating', () => {
    const swapped = toggleTastePick(toggleTastePick({ sweet: 8, fruit: 9, floral: 6 }, GROUP_1, 'sweet'), GROUP_1, 'citrus')
    assert.deepEqual(swapped, { fruit: 9, floral: 6, citrus: 5 })
    assert.equal(toggleTastePick(swapped, GROUP_1, 'sweet'), swapped)
  })

  it('lists the picked tastes of a group in display order', () => {
    assert.deepEqual(pickedTastes({ floral: 6, sweet: 8, peat: 2 }, GROUP_1), ['sweet', 'floral'])
    assert.deepEqual(pickedTastes({ floral: 6, sweet: 8, peat: 2 }, GROUP_2), ['peat'])
  })
})

describe('validateSommelierInput', () => {
  it('sends the 6 rated tastes, all style ratings and the budget; unpicked tastes stay absent', () => {
    const result = validateSommelierInput(
      draft({ budget: 3500, freeText: '  今天工作很累，想一個人慢慢喝，希望不要太刺激。  ' }),
    )

    assert.deepEqual(result, {
      ok: true,
      value: {
        taste: TASTE,
        style: STYLE,
        budget: { max: 3500 },
        freeText: '今天工作很累，想一個人慢慢喝，希望不要太刺激。',
      },
    })
    if (result.ok) {
      for (const key of ['driedFruit', 'citrus', 'vanillaCaramel', 'nutty', 'spice', 'oak'] as const) {
        assert.equal(key in result.value.taste, false, key)
      }
    }
  })

  it('sends tastes in canonical order, whatever order they were picked in', () => {
    const result = validateSommelierInput(draft({ taste: { smoke: 1, floral: 6, peat: 2, sweet: 8, chocolateCoffee: 8, fruit: 9 } }))
    assert.deepEqual(result.ok && Object.keys(result.value.taste), [
      'sweet',
      'fruit',
      'floral',
      'chocolateCoffee',
      'peat',
      'smoke',
    ])
  })

  it('accepts the 1 and 10 boundaries', () => {
    const result = validateSommelierInput(
      draft({ taste: { ...TASTE, sweet: 1, smoke: 10 }, style: { body: 1, intensity: 10, smoothness: 1 } }),
    )
    assert.equal(result.ok, true)
  })

  it('rejects an untouched draft with no tastes picked', () => {
    const result = validateSommelierInput(createEmptySommelierDraft())
    assert.equal(result.ok, false)
    if (!result.ok) assert.ok(result.errors.taste)
  })

  it('rejects fewer or more than 3 picks in a group', () => {
    const { smoke: _smoke, ...twoInGroup2 } = TASTE
    const fourInGroup1 = { ...TASTE, citrus: 5 }
    assert.equal(validateSommelierInput(draft({ taste: twoInGroup2 })).ok, false)
    assert.equal(validateSommelierInput(draft({ taste: fourInGroup1 })).ok, false)
  })

  it('drops keys that are not taste or style dimensions', () => {
    const result = validateSommelierInput(
      draft({
        taste: { ...TASTE, salty: 9 } as SommelierInputDraft['taste'],
        style: { ...STYLE, sweetness: 3 } as SommelierInputDraft['style'],
      }),
    )
    assert.deepEqual(result.ok && result.value.taste, TASTE)
    assert.deepEqual(result.ok && result.value.style, STYLE)
  })

  for (const invalid of [0, 11, 5.5, -1, 65, Number.NaN, '5' as unknown as number]) {
    it(`rejects taste and style rating ${String(invalid)}`, () => {
      const asTaste = validateSommelierInput(draft({ taste: { ...TASTE, sweet: invalid } }))
      const asStyle = validateSommelierInput(draft({ style: { ...STYLE, body: invalid } }))

      assert.equal(asTaste.ok, false)
      assert.equal(asStyle.ok, false)
      if (!asTaste.ok) assert.ok(asTaste.errors.taste)
      if (!asStyle.ok) assert.ok(asStyle.errors.style)
    })
  }

  it('rejects a missing style dimension', () => {
    const { smoothness: _smoothness, ...style } = STYLE
    const result = validateSommelierInput(draft({ style: style as SommelierInputDraft['style'] }))
    assert.equal(result.ok, false)
  })

  it('rejects the legacy flavor-tag list', () => {
    const result = validateSommelierInput(draft({ taste: ['sweet'] as unknown as SommelierInputDraft['taste'] }))
    assert.equal(result.ok, false)
  })

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
