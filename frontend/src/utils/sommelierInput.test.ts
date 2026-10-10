import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { OccasionChoice, SommelierInputDraft, TasteKey, TasteProfile } from '../types/sommelier.ts'
import {
  BUDGET_MAX,
  BUDGET_MIN,
  OCCASION_OPTIONS,
  RATING_DEFAULT,
  RATING_MAX,
  RATING_MIN,
  STYLE_KEYS,
  STYLE_LABELS,
  TASTE_EXAMPLES,
  TASTE_GROUPS,
  TASTE_KEYS,
  TASTE_LABELS,
  TASTE_PICKS_MAX,
  TASTE_PICKS_MIN,
  TASTE_SCALE_HINTS,
  canPickMoreTastes,
  createEmptySommelierDraft,
  describeStyleRating,
  describeTasteLevel,
  pickedTastes,
  toggleTastePick,
  validateSommelierInput,
} from './sommelierInput.ts'

const [GROUP_1 = [], GROUP_2 = []] = TASTE_GROUPS
const TASTE: TasteProfile = { fruit: 9, floral: 6, maltGrain: 7, peat: 2 }
const STYLE = { body: 8, intensity: 6, smoothness: 9 }

function draft(overrides: Partial<SommelierInputDraft> = {}): SommelierInputDraft {
  return { ...createEmptySommelierDraft(), taste: { ...TASTE }, style: { ...STYLE }, occasion: 'none', ...overrides }
}

function pickAll(keys: TasteKey[], start: TasteProfile = {}): TasteProfile {
  return keys.reduce((taste, key) => toggleTastePick(taste, key), start)
}

describe('sommelier preference dimensions', () => {
  it('has the 10 taste dimensions in order, with Chinese labels', () => {
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
    assert.deepEqual(Object.values(TASTE_LABELS), [
      '果香',
      '甜香',
      '花香',
      '麥芽／穀物',
      '堅果',
      '巧克力／咖啡',
      '香料',
      '木質／橡木',
      '泥煤',
      '煙燻',
    ])
  })

  it('no longer has the merged tastes', () => {
    for (const legacy of ['driedFruit', 'citrus', 'vanillaCaramel']) {
      assert.equal(TASTE_KEYS.includes(legacy as TasteKey), false, legacy)
    }
  })

  it('gives every taste examples, keeping the merged tastes as examples', () => {
    for (const key of TASTE_KEYS) {
      assert.ok(TASTE_EXAMPLES[key], key)
    }
    assert.match(TASTE_EXAMPLES.fruit, /柑橘/)
    assert.match(TASTE_EXAMPLES.fruit, /葡萄乾/)
    assert.match(TASTE_EXAMPLES.sweet, /香草/)
    assert.match(TASTE_EXAMPLES.sweet, /焦糖/)
  })

  it('offers the tastes in two groups of five, with 3–5 picks in total', () => {
    assert.deepEqual(TASTE_GROUPS, [
      ['fruit', 'sweet', 'floral', 'maltGrain', 'nutty'],
      ['chocolateCoffee', 'spice', 'oak', 'peat', 'smoke'],
    ])
    assert.equal(TASTE_PICKS_MIN, 3)
    assert.equal(TASTE_PICKS_MAX, 5)
  })

  it('offers the 7 occasions plus "no particular occasion", each with an icon', () => {
    assert.deepEqual(
      OCCASION_OPTIONS.map((option) => `${option.icon} ${option.label}`),
      ['🌙 放鬆獨飲', '🥃 專心品飲', '🥂 朋友聚會', '🍽️ 搭配餐點', '❤️ 伴侶約會', '🎁 送禮', '🎉 慶祝時刻', '✨ 沒有特定情境'],
    )
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

  it('starts with no tastes picked, style at 5, no occasion, a NT$ 2,000 budget and no free text', () => {
    assert.deepEqual(createEmptySommelierDraft(), {
      taste: {},
      style: { body: 5, intensity: 5, smoothness: 5 },
      occasion: null,
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
  it('describes how pronounced a taste should be, not how much it is liked', () => {
    const words = Array.from({ length: 10 }, (_, index) => describeTasteLevel(index + 1))
    assert.deepEqual(words, [
      '淡淡帶到即可',
      '淡淡帶到即可',
      '稍微帶到',
      '稍微帶到',
      '明顯感受得到',
      '明顯感受得到',
      '相當突出',
      '相當突出',
      '希望成為主要風味',
      '希望成為主要風味',
    ])
    assert.deepEqual(TASTE_SCALE_HINTS, { min: '淡淡帶到即可', max: '希望成為主要風味' })
    for (const liking of ['不喜歡', '普通', '喜歡', '最愛']) {
      assert.equal(words.some((word) => word.includes(liking)), false, liking)
    }
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
  it('starts a new pick at 5 and fills in nothing else', () => {
    assert.deepEqual(toggleTastePick({}, 'floral'), { floral: 5 })
  })

  it('removes the rating when a pick is undone', () => {
    assert.deepEqual(toggleTastePick({ sweet: 8, floral: 6 }, 'sweet'), { floral: 6 })
  })

  it('accumulates picks across both groups', () => {
    const taste = pickAll(['fruit', 'floral', 'peat'])
    assert.deepEqual(pickedTastes(taste), ['fruit', 'floral', 'peat'])
    assert.deepEqual(pickedTastes(taste, GROUP_1), ['fruit', 'floral'])
    assert.deepEqual(pickedTastes(taste, GROUP_2), ['peat'])
  })

  it('keeps every pick when moving between groups and back', () => {
    const afterGroup1 = pickAll(['fruit', 'sweet'])
    const afterGroup2 = pickAll(['smoke'], afterGroup1)
    const backInGroup1 = toggleTastePick(afterGroup2, 'nutty')
    assert.deepEqual(backInGroup1, { fruit: 5, sweet: 5, smoke: 5, nutty: 5 })
  })

  it('allows a whole group with no picks', () => {
    const taste = pickAll(['chocolateCoffee', 'spice', 'peat'])
    assert.deepEqual(pickedTastes(taste, GROUP_1), [])
    assert.equal(validateSommelierInput(draft({ taste })).ok, true)
  })

  it('stops at 5 picks in total, but still allows un-picking', () => {
    const full = pickAll(['fruit', 'sweet', 'floral', 'peat', 'smoke'])
    assert.equal(pickedTastes(full).length, 5)
    assert.equal(canPickMoreTastes(full), false)
    assert.equal(toggleTastePick(full, 'oak'), full)
    assert.equal(toggleTastePick(full, 'nutty'), full)

    const four = toggleTastePick(full, 'sweet')
    assert.equal(canPickMoreTastes(four), true)
    assert.deepEqual(toggleTastePick(four, 'oak'), { fruit: 5, floral: 5, peat: 5, smoke: 5, oak: 5 })
  })

  it('lets a re-pick start again at 5, never keeping the old rating', () => {
    const undone = toggleTastePick({ fruit: 9, floral: 6, peat: 2 }, 'fruit')
    assert.deepEqual(toggleTastePick(undone, 'fruit'), { floral: 6, peat: 2, fruit: 5 })
  })

  it('lists picked tastes in display order', () => {
    assert.deepEqual(pickedTastes({ smoke: 1, floral: 6, fruit: 8 }), ['fruit', 'floral', 'smoke'])
  })
})

describe('validateSommelierInput', () => {
  it('sends the rated tastes, all style ratings and the budget; unpicked tastes stay absent', () => {
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
      for (const key of ['sweet', 'nutty', 'chocolateCoffee', 'spice', 'oak', 'smoke'] as const) {
        assert.equal(key in result.value.taste, false, key)
      }
    }
  })

  it('sends tastes in canonical order, whatever order they were picked in', () => {
    const result = validateSommelierInput(draft({ taste: { smoke: 1, floral: 6, maltGrain: 4, sweet: 8, fruit: 9 } }))
    assert.deepEqual(result.ok && Object.keys(result.value.taste), ['fruit', 'sweet', 'floral', 'maltGrain', 'smoke'])
  })

  for (const count of [3, 4, 5]) {
    it(`accepts ${count} picked tastes`, () => {
      const taste = pickAll(TASTE_KEYS.slice(0, count))
      assert.equal(validateSommelierInput(draft({ taste })).ok, true)
    })
  }

  for (const count of [0, 1, 2, 6, 10]) {
    it(`rejects ${count} picked tastes`, () => {
      const taste = Object.fromEntries(TASTE_KEYS.slice(0, count).map((key) => [key, 5])) as TasteProfile
      const result = validateSommelierInput(draft({ taste }))
      assert.equal(result.ok, false)
      if (!result.ok) assert.ok(result.errors.taste)
    })
  }

  it('rejects an untouched draft with no tastes picked', () => {
    const result = validateSommelierInput(createEmptySommelierDraft())
    assert.equal(result.ok, false)
    if (!result.ok) assert.ok(result.errors.taste)
  })

  it('rejects a picked taste without a rating', () => {
    const missing = { ...TASTE, sweet: null } as unknown as TasteProfile
    assert.equal(validateSommelierInput(draft({ taste: missing })).ok, false)
  })

  it('accepts the 1 and 10 boundaries', () => {
    const result = validateSommelierInput(
      draft({ taste: { ...TASTE, fruit: 1, peat: 10 }, style: { body: 1, intensity: 10, smoothness: 1 } }),
    )
    assert.equal(result.ok, true)
  })

  it('drops keys that are not taste or style dimensions, including retired ones', () => {
    const result = validateSommelierInput(
      draft({
        taste: { ...TASTE, salty: 9, driedFruit: 8 } as SommelierInputDraft['taste'],
        style: { ...STYLE, sweetness: 3 } as SommelierInputDraft['style'],
      }),
    )
    assert.deepEqual(result.ok && result.value.taste, TASTE)
    assert.deepEqual(result.ok && result.value.style, STYLE)
  })

  it('does not count unknown keys toward the 3 picks', () => {
    const taste = { fruit: 8, floral: 6, citrus: 7, vanillaCaramel: 5 } as SommelierInputDraft['taste']
    assert.equal(validateSommelierInput(draft({ taste })).ok, false)
  })

  for (const invalid of [0, 11, 5.5, -1, 65, Number.NaN, '5' as unknown as number]) {
    it(`rejects taste and style rating ${String(invalid)}`, () => {
      const asTaste = validateSommelierInput(draft({ taste: { ...TASTE, fruit: invalid } }))
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

  it('sends the picked occasion', () => {
    for (const occasion of ['relaxing', 'tasting', 'social', 'meal', 'date', 'gift', 'celebration'] as const) {
      const result = validateSommelierInput(draft({ occasion }))
      assert.equal(result.ok && result.value.occasion, occasion)
    }
  })

  it('omits the occasion for "no particular occasion"', () => {
    const result = validateSommelierInput(draft({ occasion: 'none' }))
    assert.equal(result.ok, true)
    if (result.ok) assert.equal('occasion' in result.value, false)
  })

  it('rejects an unanswered or unsupported occasion', () => {
    for (const occasion of [null, 'beginner' as OccasionChoice]) {
      const result = validateSommelierInput(draft({ occasion }))
      assert.equal(result.ok, false)
      if (!result.ok) assert.ok(result.errors.occasion)
    }
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
