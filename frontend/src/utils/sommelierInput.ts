import type {
  OccasionChoice,
  SommelierInput,
  SommelierInputDraft,
  SommelierInputErrors,
  SommelierInputResult,
  StyleKey,
  StyleProfile,
  TasteKey,
  TasteProfile,
} from '../types/sommelier.ts'
import { PREFERENCE_OCCASION_LABELS } from './sommelierPreference.ts'

export const TASTE_LABELS: Record<TasteKey, string> = {
  fruit: '果香',
  sweet: '甜香',
  floral: '花香',
  maltGrain: '麥芽／穀物',
  nutty: '堅果',
  chocolateCoffee: '巧克力／咖啡',
  spice: '香料',
  oak: '木質／橡木',
  peat: '泥煤',
  smoke: '煙燻',
}

export const TASTE_KEYS = Object.keys(TASTE_LABELS) as TasteKey[]

/** Familiar examples, shown under each taste option. */
export const TASTE_EXAMPLES: Record<TasteKey, string> = {
  fruit: '蘋果、西洋梨、柑橘、葡萄乾',
  sweet: '蜂蜜、香草、焦糖、太妃糖',
  floral: '石楠花、玫瑰、橙花',
  maltGrain: '麥片、餅乾、烤麵包',
  nutty: '杏仁、榛果、核桃',
  chocolateCoffee: '黑巧克力、可可、咖啡',
  spice: '肉桂、丁香、黑胡椒、薑',
  oak: '橡木、雪松、檀木',
  peat: '泥土、海藻、碘酒',
  smoke: '營火、煙燻培根、焦木',
}

/** The conversation shows the tastes in two groups of five, one group at a time. */
export const TASTE_GROUPS: readonly (readonly TasteKey[])[] = [TASTE_KEYS.slice(0, 5), TASTE_KEYS.slice(5)]

/** Picks are counted across both groups. */
export const TASTE_PICKS_MIN = 3
export const TASTE_PICKS_MAX = 5

export const STYLE_LABELS: Record<StyleKey, string> = {
  body: '酒體',
  intensity: '風味強度',
  smoothness: '順口度',
}

export const STYLE_KEYS = Object.keys(STYLE_LABELS) as StyleKey[]

/** What 1 and 10 mean for each style slider. */
export const STYLE_SCALE_HINTS: Record<StyleKey, { min: string; max: string }> = {
  body: { min: '輕盈', max: '厚重' },
  intensity: { min: '柔和', max: '強烈' },
  smoothness: { min: '粗獷／刺激', max: '圓潤／順口' },
}

export const RATING_MIN = 1
export const RATING_MAX = 10
export const RATING_DEFAULT = 1

/** What 1 and 10 mean for a taste: how pronounced it should be, not how much it is liked. */
export const TASTE_SCALE_HINTS = { min: '淡淡帶到即可', max: '希望成為主要風味' } as const

/** Words shown beside a taste rating while the slider moves; display only. */
export function describeTasteLevel(value: number): string {
  if (value <= 2) return '淡淡帶到即可'
  if (value <= 4) return '稍微帶到'
  if (value <= 6) return '明顯感受得到'
  if (value <= 8) return '相當突出'
  return '希望成為主要風味'
}

/** Words shown beside a style rating, leaning toward the nearer end of its scale. */
export function describeStyleRating(key: StyleKey, value: number): string {
  const { min, max } = STYLE_SCALE_HINTS[key]
  if (value <= 2) return `很${min}`
  if (value <= 4) return `偏${min}`
  if (value <= 6) return '適中'
  if (value <= 8) return `偏${max}`
  return `很${max}`
}

/** The occasion question offers these, in order; pick exactly one. */
export const OCCASION_OPTIONS: readonly { value: OccasionChoice; icon: string; label: string }[] = [
  { value: 'relaxing', icon: '🌙', label: PREFERENCE_OCCASION_LABELS.relaxing },
  { value: 'tasting', icon: '🥃', label: PREFERENCE_OCCASION_LABELS.tasting },
  { value: 'social', icon: '🥂', label: PREFERENCE_OCCASION_LABELS.social },
  { value: 'meal', icon: '🍽️', label: PREFERENCE_OCCASION_LABELS.meal },
  { value: 'date', icon: '❤️', label: PREFERENCE_OCCASION_LABELS.date },
  { value: 'gift', icon: '🎁', label: PREFERENCE_OCCASION_LABELS.gift },
  { value: 'celebration', icon: '🎉', label: PREFERENCE_OCCASION_LABELS.celebration },
  { value: 'none', icon: '✨', label: '沒有特定情境' },
]

export const BUDGET_MIN = 1000
export const BUDGET_MAX = 8000
export const BUDGET_STEP = 100
export const BUDGET_DEFAULT = 2500

export function createEmptySommelierDraft(): SommelierInputDraft {
  return {
    taste: {},
    style: { body: RATING_DEFAULT, intensity: RATING_DEFAULT, smoothness: RATING_DEFAULT },
    occasion: null,
    budget: BUDGET_DEFAULT,
    freeText: '',
  }
}

/** Picked tastes in display order, optionally limited to one group. */
export function pickedTastes(taste: TasteProfile, keys: readonly TasteKey[] = TASTE_KEYS): TasteKey[] {
  return keys.filter((key) => taste[key] !== undefined)
}

export function canPickMoreTastes(taste: TasteProfile): boolean {
  return pickedTastes(taste).length < TASTE_PICKS_MAX
}

/**
 * Picks or un-picks a taste. A new pick starts at the default rating; un-picking
 * removes its rating; once 5 are picked in total, further picks are ignored.
 */
export function toggleTastePick(taste: TasteProfile, key: TasteKey): TasteProfile {
  if (taste[key] !== undefined) {
    const { [key]: _removed, ...rest } = taste
    return rest
  }
  if (!canPickMoreTastes(taste)) {
    return taste
  }
  return { ...taste, [key]: RATING_DEFAULT }
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

/** Picked tastes in canonical order, or null unless 3–5 are picked and each has a valid rating. */
function normalizeTaste(taste: unknown): TasteProfile | null {
  if (typeof taste !== 'object' || taste === null || Array.isArray(taste)) {
    return null
  }
  const values = taste as Record<string, unknown>
  const picked = TASTE_KEYS.filter((key) => values[key] !== undefined)
  if (picked.length < TASTE_PICKS_MIN || picked.length > TASTE_PICKS_MAX) {
    return null
  }
  const result: TasteProfile = {}
  for (const key of picked) {
    const value = values[key]
    if (!isIntegerInRange(value, RATING_MIN, RATING_MAX)) {
      return null
    }
    result[key] = value
  }
  return result
}

function normalizeStyle(style: unknown): StyleProfile | null {
  if (typeof style !== 'object' || style === null) {
    return null
  }
  const values = style as Record<string, unknown>
  const result = {} as StyleProfile
  for (const key of STYLE_KEYS) {
    const value = values[key]
    if (!isIntegerInRange(value, RATING_MIN, RATING_MAX)) {
      return null
    }
    result[key] = value
  }
  return result
}

/** Validates the conversation values into the preference profile and recommendation request body. */
export function validateSommelierInput(draft: SommelierInputDraft): SommelierInputResult {
  const errors: SommelierInputErrors = {}

  const taste = normalizeTaste(draft.taste)
  if (!taste) {
    errors.taste = `請選 ${TASTE_PICKS_MIN}–${TASTE_PICKS_MAX} 種風味，並為每種給 ${RATING_MIN}–${RATING_MAX} 分`
  }

  const style = normalizeStyle(draft.style)
  if (!style) {
    errors.style = `請將喝感調整為 ${RATING_MIN}–${RATING_MAX} 的整數`
  }

  const occasionValid = OCCASION_OPTIONS.some((option) => option.value === draft.occasion)
  if (!occasionValid) {
    errors.occasion = '請選一個情境'
  }

  if (!isIntegerInRange(draft.budget, BUDGET_MIN, BUDGET_MAX)) {
    errors.budget = `預算需介於 ${BUDGET_MIN}–${BUDGET_MAX}`
  }

  if (typeof draft.freeText !== 'string') {
    errors.freeText = '補充說明格式不正確'
  }

  if (!taste || !style || Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  const value: SommelierInput = {
    taste,
    style,
    ...(draft.occasion && draft.occasion !== 'none' ? { occasion: draft.occasion } : {}),
    budget: { max: draft.budget },
  }

  const freeText = draft.freeText.trim()
  if (freeText) {
    value.freeText = freeText
  }

  return { ok: true, value }
}
