import type {
  SommelierInput,
  SommelierInputDraft,
  SommelierInputErrors,
  SommelierInputResult,
  StyleKey,
  StyleProfile,
  TasteKey,
  TasteProfile,
} from '../types/sommelier.ts'

export const TASTE_LABELS: Record<TasteKey, string> = {
  sweet: '甜感',
  fruit: '水果',
  driedFruit: '果乾',
  citrus: '柑橘',
  floral: '花香',
  vanillaCaramel: '香草／焦糖',
  nutty: '堅果',
  chocolateCoffee: '巧克力／咖啡',
  spice: '香料',
  oak: '橡木',
  peat: '泥煤',
  smoke: '煙燻',
}

export const TASTE_KEYS = Object.keys(TASTE_LABELS) as TasteKey[]

/** The conversation offers the tastes in two groups of six. */
export const TASTE_GROUPS: readonly (readonly TasteKey[])[] = [TASTE_KEYS.slice(0, 6), TASTE_KEYS.slice(6)]

/** How many tastes the user picks, and then rates, from each group. */
export const TASTE_PICKS_PER_GROUP = 3

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
export const RATING_DEFAULT = 5

/** Words shown beside a taste rating while the slider moves; display only. */
export function describeTasteRating(value: number): string {
  if (value <= 2) return '不太喜歡'
  if (value <= 4) return '還好'
  if (value <= 6) return '普通'
  if (value === 7) return '喜歡'
  if (value <= 9) return '很喜歡'
  return '最愛'
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

export const BUDGET_MIN = 1000
export const BUDGET_MAX = 6000
export const BUDGET_STEP = 100
export const BUDGET_DEFAULT = 2000

export function createEmptySommelierDraft(): SommelierInputDraft {
  return {
    taste: {},
    style: { body: RATING_DEFAULT, intensity: RATING_DEFAULT, smoothness: RATING_DEFAULT },
    budget: BUDGET_DEFAULT,
    freeText: '',
  }
}

/** Picked tastes of one group, in display order. */
export function pickedTastes(taste: TasteProfile, group: readonly TasteKey[]): TasteKey[] {
  return group.filter((key) => taste[key] !== undefined)
}

/**
 * Picks or un-picks a taste. A new pick starts at the default rating; un-picking
 * removes its rating; a full group ignores further picks.
 */
export function toggleTastePick(taste: TasteProfile, group: readonly TasteKey[], key: TasteKey): TasteProfile {
  if (taste[key] !== undefined) {
    const { [key]: _removed, ...rest } = taste
    return rest
  }
  if (pickedTastes(taste, group).length >= TASTE_PICKS_PER_GROUP) {
    return taste
  }
  return { ...taste, [key]: RATING_DEFAULT }
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

/** Picked tastes in canonical order, or null unless each group has exactly 3 valid ratings. */
function normalizeTaste(taste: unknown): TasteProfile | null {
  if (typeof taste !== 'object' || taste === null || Array.isArray(taste)) {
    return null
  }
  const values = taste as Record<string, unknown>
  const result: TasteProfile = {}
  for (const group of TASTE_GROUPS) {
    const picked = group.filter((key) => values[key] !== undefined)
    if (picked.length !== TASTE_PICKS_PER_GROUP) {
      return null
    }
    for (const key of picked) {
      const value = values[key]
      if (!isIntegerInRange(value, RATING_MIN, RATING_MAX)) {
        return null
      }
      result[key] = value
    }
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

/** Validates the conversation values and produces the request body for the Preference API. */
export function validateSommelierInput(draft: SommelierInputDraft): SommelierInputResult {
  const errors: SommelierInputErrors = {}

  const taste = normalizeTaste(draft.taste)
  if (!taste) {
    errors.taste = `請在每一組各選 ${TASTE_PICKS_PER_GROUP} 種風味，並給 ${RATING_MIN}–${RATING_MAX} 分`
  }

  const style = normalizeStyle(draft.style)
  if (!style) {
    errors.style = `請將喝感調整為 ${RATING_MIN}–${RATING_MAX} 的整數`
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
    budget: { max: draft.budget },
  }

  const freeText = draft.freeText.trim()
  if (freeText) {
    value.freeText = freeText
  }

  return { ok: true, value }
}
