import type {
  FlavorTag,
  SommelierInput,
  SommelierInputDraft,
  SommelierInputErrors,
  SommelierInputResult,
  SommelierOccasion,
} from '../types/sommelier.ts'

export const FLAVOR_TAG_LABELS: Record<FlavorTag, string> = {
  sweet: '甜感',
  fruity: '果香',
  floral: '花香',
  vanilla: '香草',
  woody: '木質／橡木桶',
  spicy: '辛香料',
  smoky: '煙燻',
  peaty: '泥煤',
  maritime: '海潮／鹹味',
}

export const FLAVOR_TAGS = Object.keys(FLAVOR_TAG_LABELS) as FlavorTag[]

/** Flavor chips offered in Q1 (§2.6); smoke and peat are asked separately as intensity. */
export const TASTE_CHOICES: readonly FlavorTag[] = ['sweet', 'fruity', 'floral', 'vanilla', 'woody', 'spicy']

export const OCCASION_LABELS: Record<SommelierOccasion, string> = {
  relaxing: '放鬆、獨飲',
  social: '聚會、朋友小酌',
  meal: '搭配餐點',
  gift: '送禮',
  beginner: '入門、第一次嘗試',
  premium: '特別場合、想喝好一點',
}

export const INTENSITY_MIN = 0
export const INTENSITY_MAX = 100

export const BUDGET_MIN = 1000
export const BUDGET_MAX = 6000
export const BUDGET_STEP = 100
export const BUDGET_DEFAULT = 2000

export function createEmptySommelierDraft(): SommelierInputDraft {
  return {
    taste: [],
    peaty: INTENSITY_MIN,
    smoky: INTENSITY_MIN,
    budget: BUDGET_DEFAULT,
    freeText: '',
  }
}

function isTasteChoice(value: unknown): value is FlavorTag {
  return typeof value === 'string' && (TASTE_CHOICES as readonly string[]).includes(value)
}

/** Returns de-duplicated tags in first-seen order, or null if any value is not a Q1 choice. */
function normalizeTaste(values: unknown): FlavorTag[] | null {
  if (!Array.isArray(values)) {
    return null
  }

  const tags: FlavorTag[] = []
  for (const value of values) {
    if (!isTasteChoice(value)) {
      return null
    }
    if (!tags.includes(value)) {
      tags.push(value)
    }
  }
  return tags
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

/** Validates the conversational Step 1 values and produces the normalized Step 1 output (§2.6, §3.1). */
export function validateSommelierInput(draft: SommelierInputDraft): SommelierInputResult {
  const errors: SommelierInputErrors = {}

  const taste = normalizeTaste(draft.taste)
  if (!taste) {
    errors.taste = '請從清單中選擇風味'
  } else if (taste.length === 0) {
    errors.taste = '請至少選擇一種風味'
  }

  if (
    !isIntegerInRange(draft.peaty, INTENSITY_MIN, INTENSITY_MAX) ||
    !isIntegerInRange(draft.smoky, INTENSITY_MIN, INTENSITY_MAX)
  ) {
    errors.intensity = `強度需為 ${INTENSITY_MIN}–${INTENSITY_MAX} 的整數`
  }

  if (!isIntegerInRange(draft.budget, BUDGET_MIN, BUDGET_MAX)) {
    errors.budget = `預算需介於 ${BUDGET_MIN}–${BUDGET_MAX}`
  }

  if (typeof draft.freeText !== 'string') {
    errors.freeText = '補充說明格式不正確'
  }

  if (!taste || Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  const value: SommelierInput = {
    taste,
    intensity: { peaty: draft.peaty, smoky: draft.smoky },
    budget: { max: draft.budget },
  }

  const freeText = draft.freeText.trim()
  if (freeText) {
    value.freeText = freeText
  }

  return { ok: true, value }
}
