import { COMPANIONS, MOODS, OCCASIONS, STYLE_KEYS, TASTE_KEYS } from '../types/sommelier'
import type {
  Preference,
  PreferenceBudget,
  PreferenceExtraction,
  SommelierInput,
  StyleProfile,
  TasteProfile,
} from '../types/sommelier'
import { AppError } from '../utils/AppError'
import {
  EXTRACTION_MALFORMED_MESSAGE,
  extractPreferenceFromFreeText,
} from './openaiPreferenceExtractor'

const EMPTY_EXTRACTION: PreferenceExtraction = {}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value)
}

function toBudgetValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined
}

function buildBudget(min: number | undefined, max: number | undefined): PreferenceBudget | undefined {
  if (min === undefined && max === undefined) {
    return undefined
  }
  return {
    ...(min !== undefined ? { min } : {}),
    ...(max !== undefined ? { max } : {}),
  }
}

/**
 * Copies the provided ratings in canonical key order, so the Preference never
 * carries extra keys. Keys without a rating stay absent (not provided).
 */
function copyRatings<K extends string>(
  keys: readonly K[],
  ratings: Partial<Record<K, number>>,
): Partial<Record<K, number>> {
  return Object.fromEntries(
    keys.filter((key) => ratings[key] !== undefined).map((key) => [key, ratings[key]]),
  ) as Partial<Record<K, number>>
}

/**
 * Validates raw LLM output (§4.7): unknown fields and values outside the
 * allowed sets are dropped, so nothing the LLM invents reaches the Preference.
 */
export function sanitizeExtraction(raw: unknown): PreferenceExtraction {
  if (!isPlainObject(raw)) {
    throw new AppError(502, EXTRACTION_MALFORMED_MESSAGE)
  }

  const extraction: PreferenceExtraction = {}

  const budget = isPlainObject(raw.budget)
    ? buildBudget(toBudgetValue(raw.budget.min), toBudgetValue(raw.budget.max))
    : undefined
  if (budget) {
    extraction.budget = budget
  }
  if (isOneOf(OCCASIONS, raw.occasion)) {
    extraction.occasion = raw.occasion
  }
  if (isOneOf(MOODS, raw.mood)) {
    extraction.mood = raw.mood
  }
  if (isOneOf(COMPANIONS, raw.companion)) {
    extraction.companion = raw.companion
  }

  return extraction
}

/**
 * Merges the conversation input with the validated extraction. Taste and style are
 * explicit user ratings and are never changed or filled in by freeText. For budget
 * and occasion, what the LLM extracted from freeText overrides the picked value.
 */
export function mergePreference(
  input: SommelierInput,
  extraction: PreferenceExtraction,
): Preference {
  const preference: Preference = {
    taste: copyRatings(TASTE_KEYS, input.taste) as TasteProfile,
    style: copyRatings(STYLE_KEYS, input.style) as StyleProfile,
  }

  const budget = buildBudget(
    extraction.budget?.min ?? input.budget?.min,
    extraction.budget?.max ?? input.budget?.max,
  )
  if (budget) {
    preference.budget = budget
  }
  const occasion = extraction.occasion ?? input.occasion
  if (occasion) {
    preference.occasion = occasion
  }
  if (extraction.mood) {
    preference.mood = extraction.mood
  }
  if (extraction.companion) {
    preference.companion = extraction.companion
  }

  return preference
}

/** Builds a Preference, calling the LLM only when freeText is provided. */
export async function buildPreference(input: SommelierInput): Promise<Preference> {
  const freeText = input.freeText?.trim()
  if (!freeText) {
    return mergePreference(input, EMPTY_EXTRACTION)
  }

  const raw = await extractPreferenceFromFreeText(freeText)
  return mergePreference(input, sanitizeExtraction(raw))
}
