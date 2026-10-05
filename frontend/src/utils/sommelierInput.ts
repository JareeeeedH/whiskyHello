import type {
  FlavorTag,
  SommelierBudget,
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

export const OCCASION_LABELS: Record<SommelierOccasion, string> = {
  relaxing: '放鬆、獨飲',
  social: '聚會、朋友小酌',
  meal: '搭配餐點',
  gift: '送禮',
  beginner: '入門、第一次嘗試',
  premium: '特別場合、想喝好一點',
}

export const OCCASIONS = Object.keys(OCCASION_LABELS) as SommelierOccasion[]

export function createEmptySommelierDraft(): SommelierInputDraft {
  return {
    taste: [],
    dislikes: [],
    budgetMin: null,
    budgetMax: null,
    occasion: null,
    freeText: '',
  }
}

function isFlavorTag(value: unknown): value is FlavorTag {
  return typeof value === 'string' && (FLAVOR_TAGS as string[]).includes(value)
}

function isOccasion(value: unknown): value is SommelierOccasion {
  return typeof value === 'string' && (OCCASIONS as string[]).includes(value)
}

/** Returns de-duplicated tags in first-seen order, or null if any value is not a known tag. */
function normalizeTags(values: unknown): FlavorTag[] | null {
  if (!Array.isArray(values)) {
    return null
  }

  const tags: FlavorTag[] = []
  for (const value of values) {
    if (!isFlavorTag(value)) {
      return null
    }
    if (!tags.includes(value)) {
      tags.push(value)
    }
  }
  return tags
}

function isValidBudgetValue(value: unknown): boolean {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0)
}

/** Validates Step 1 form values and produces the normalized Step 1 output (spec §2.4, §3.2). */
export function validateSommelierInput(draft: SommelierInputDraft): SommelierInputResult {
  const errors: SommelierInputErrors = {}

  const taste = normalizeTags(draft.taste)
  if (!taste) {
    errors.taste = '請從清單中選擇風味'
  }

  const dislikes = normalizeTags(draft.dislikes)
  if (!dislikes) {
    errors.dislikes = '請從清單中選擇風味'
  }

  if (!isValidBudgetValue(draft.budgetMin) || !isValidBudgetValue(draft.budgetMax)) {
    errors.budget = '預算需為大於或等於 0 的數字'
  }

  if (draft.occasion !== null && !isOccasion(draft.occasion)) {
    errors.occasion = '請從清單中選擇情境'
  }

  if (typeof draft.freeText !== 'string') {
    errors.freeText = '補充說明格式不正確'
  }

  if (!taste || !dislikes || Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  const value: SommelierInput = { taste, dislikes }

  const budget: SommelierBudget = {}
  if (draft.budgetMin !== null) {
    budget.min = draft.budgetMin
  }
  if (draft.budgetMax !== null) {
    budget.max = draft.budgetMax
  }
  if (budget.min !== undefined || budget.max !== undefined) {
    value.budget = budget
  }

  if (isOccasion(draft.occasion)) {
    value.occasion = draft.occasion
  }

  const freeText = draft.freeText.trim()
  if (freeText) {
    value.freeText = freeText
  }

  return { ok: true, value }
}
