import {
  COMPANIONS,
  FLAVOR_TAGS,
  MOODS,
  PREFERENCE_OCCASIONS,
  TASTE_LEVELS,
} from '../types/sommelier'
import type {
  FlavorTag,
  Preference,
  PreferenceBudget,
  PreferenceExtraction,
  PreferenceIntensity,
  PreferenceTaste,
  SommelierInput,
} from '../types/sommelier'
import { AppError } from '../utils/AppError'
import {
  EXTRACTION_MALFORMED_MESSAGE,
  extractPreferenceFromFreeText,
} from './openaiPreferenceExtractor'

const EMPTY_EXTRACTION: PreferenceExtraction = { taste: [], dislikes: [] }

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

/** Copies only the defined intensity values; returns undefined when none are set. */
function buildIntensity(intensity: PreferenceIntensity | undefined): PreferenceIntensity | undefined {
  if (intensity?.peaty === undefined && intensity?.smoky === undefined) {
    return undefined
  }
  return {
    ...(intensity.peaty !== undefined ? { peaty: intensity.peaty } : {}),
    ...(intensity.smoky !== undefined ? { smoky: intensity.smoky } : {}),
  }
}

/**
 * Validates raw LLM output (§4.7): unknown fields, values outside the allowed
 * sets, and duplicate tags are dropped. A tag the LLM put in both taste and
 * dislikes is contradictory, so it is discarded from both.
 */
export function sanitizeExtraction(raw: unknown): PreferenceExtraction {
  if (!isPlainObject(raw)) {
    throw new AppError(502, EXTRACTION_MALFORMED_MESSAGE)
  }

  const taste: PreferenceTaste[] = []
  for (const item of Array.isArray(raw.taste) ? raw.taste : []) {
    if (
      isPlainObject(item) &&
      isOneOf(FLAVOR_TAGS, item.tag) &&
      isOneOf(TASTE_LEVELS, item.level) &&
      !taste.some((existing) => existing.tag === item.tag)
    ) {
      taste.push({ tag: item.tag, level: item.level })
    }
  }

  const dislikes: FlavorTag[] = []
  for (const tag of Array.isArray(raw.dislikes) ? raw.dislikes : []) {
    if (isOneOf(FLAVOR_TAGS, tag) && !dislikes.includes(tag)) {
      dislikes.push(tag)
    }
  }

  const contradictory = new Set(taste.map((item) => item.tag).filter((tag) => dislikes.includes(tag)))

  const extraction: PreferenceExtraction = {
    taste: taste.filter((item) => !contradictory.has(item.tag)),
    dislikes: dislikes.filter((tag) => !contradictory.has(tag)),
  }

  const budget = isPlainObject(raw.budget)
    ? buildBudget(toBudgetValue(raw.budget.min), toBudgetValue(raw.budget.max))
    : undefined
  if (budget) {
    extraction.budget = budget
  }
  if (isOneOf(PREFERENCE_OCCASIONS, raw.occasion)) {
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
 * Merges Step 1 input with the validated extraction (§4.8). freeText wins on
 * conflicts; Step 1 intensity values are kept as entered. When Step 1 alone
 * lists a tag as both taste and dislike, taste is kept so every tag ends up in
 * exactly one array.
 */
export function mergePreference(
  input: SommelierInput,
  extraction: PreferenceExtraction,
): Preference {
  const llmLevels = new Map(extraction.taste.map((item) => [item.tag, item.level]))

  const taste: PreferenceTaste[] = []
  const addTaste = (item: PreferenceTaste) => {
    if (!taste.some((existing) => existing.tag === item.tag)) {
      taste.push(item)
    }
  }

  for (const tag of input.taste) {
    if (!extraction.dislikes.includes(tag)) {
      addTaste({ tag, level: llmLevels.get(tag) ?? 'medium' })
    }
  }
  for (const item of extraction.taste) {
    addTaste(item)
  }

  const tasteTags = new Set(taste.map((item) => item.tag))
  const dislikes: FlavorTag[] = []
  for (const tag of [...input.dislikes, ...extraction.dislikes]) {
    if (!tasteTags.has(tag) && !dislikes.includes(tag)) {
      dislikes.push(tag)
    }
  }

  const preference: Preference = { taste, dislikes }

  const intensity = buildIntensity(input.intensity)
  if (intensity) {
    preference.intensity = intensity
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

/** Step 2: builds a Preference, calling the LLM only when freeText is provided. */
export async function buildPreference(input: SommelierInput): Promise<Preference> {
  const freeText = input.freeText?.trim()
  if (!freeText) {
    return mergePreference(input, EMPTY_EXTRACTION)
  }

  const raw = await extractPreferenceFromFreeText(freeText)
  return mergePreference(input, sanitizeExtraction(raw))
}
