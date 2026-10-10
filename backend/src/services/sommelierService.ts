import { STYLE_KEYS, TASTE_KEYS } from '../types/sommelier'
import type {
  RecommendationResult,
  RecommendationType,
  SommelierInput,
  StyleProfile,
  TasteProfile,
  WhiskyRecommendation,
} from '../types/sommelier'
import { AppError } from '../utils/AppError'
import {
  RECOMMENDATION_MALFORMED_MESSAGE,
  requestWhiskyRecommendations,
  type WebImageResult,
} from './openaiWhiskyRecommender'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function malformed(): AppError {
  return new AppError(502, RECOMMENDATION_MALFORMED_MESSAGE)
}

/**
 * Copies the provided ratings in canonical key order, so the LLM never sees
 * extra keys. Keys without a rating stay absent (not provided).
 */
function copyRatings<K extends string>(
  keys: readonly K[],
  ratings: Partial<Record<K, number>>,
): Partial<Record<K, number>> {
  return Object.fromEntries(
    keys.filter((key) => ratings[key] !== undefined).map((key) => [key, ratings[key]]),
  ) as Partial<Record<K, number>>
}

/** The validated input as sent to the LLM: known keys only, empty optional fields left out. */
export function toLLMInput(input: SommelierInput): SommelierInput {
  const freeText = input.freeText?.trim()
  const budget = input.budget && (input.budget.min !== undefined || input.budget.max !== undefined)
    ? input.budget
    : undefined
  return {
    taste: copyRatings(TASTE_KEYS, input.taste) as TasteProfile,
    style: copyRatings(STYLE_KEYS, input.style) as StyleProfile,
    ...(input.occasion ? { occasion: input.occasion } : {}),
    ...(budget ? { budget } : {}),
    ...(freeText ? { freeText } : {}),
  }
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toTextList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw malformed()
  }
  return value.map(toText).filter(Boolean)
}

const NO_IMAGE = { imageUrl: null, imageSourceUrl: null }

/**
 * Keeps a photo only when it is exactly one of the HTTPS image results the web search
 * returned, so a guessed, edited or page URL never reaches the UI. Its source page comes
 * from that same result. A missing photo is never an error.
 */
function toImage(
  rawImageUrl: unknown,
  imageResults: WebImageResult[],
): Pick<WhiskyRecommendation, 'imageUrl' | 'imageSourceUrl'> {
  const imageUrl = toText(rawImageUrl)
  const result = imageUrl ? imageResults.find((image) => image.imageUrl === imageUrl) : undefined
  return result ? { imageUrl: result.imageUrl, imageSourceUrl: result.sourceWebsiteUrl } : NO_IMAGE
}

function toRecommendation(
  raw: unknown,
  type: RecommendationType,
  imageResults: WebImageResult[],
): WhiskyRecommendation {
  if (!isPlainObject(raw)) {
    throw malformed()
  }
  const whiskyName = toText(raw.whiskyName)
  const reason = toText(raw.reason)
  if (!whiskyName || !reason) {
    throw malformed()
  }
  return {
    type,
    whiskyName,
    reason,
    matches: toTextList(raw.matches),
    considerations: toTextList(raw.considerations),
    ...toImage(raw.imageUrl, imageResults),
  }
}

/** Compares names ignoring case, spacing and punctuation. */
export function normalizeWhiskyName(name: string): string {
  return name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

/**
 * Validates raw LLM output (§4.5); anything that does not fit is a 502, never a partial
 * result. Photos are optional and fall back to null instead.
 */
export function toRecommendationResult(
  raw: unknown,
  imageResults: WebImageResult[] = [],
): RecommendationResult {
  if (!isPlainObject(raw)) {
    throw malformed()
  }

  if (raw.status === 'unable') {
    const message = toText(raw.message)
    return message ? { status: 'unable', message } : { status: 'unable' }
  }
  if (raw.status !== 'ok') {
    throw malformed()
  }

  const bestMatch = toRecommendation(raw.bestMatch, 'best_match', imageResults)
  const alternative = toRecommendation(raw.alternative, 'alternative', imageResults)
  if (normalizeWhiskyName(bestMatch.whiskyName) === normalizeWhiskyName(alternative.whiskyName)) {
    throw malformed()
  }
  if (alternative.imageUrl && alternative.imageUrl === bestMatch.imageUrl) {
    Object.assign(alternative, NO_IMAGE)
  }
  return { status: 'ok', recommendations: [bestMatch, alternative] }
}

export async function recommendWhiskies(input: SommelierInput): Promise<RecommendationResult> {
  const { output, imageResults } = await requestWhiskyRecommendations(
    JSON.stringify(toLLMInput(input)),
  )
  return toRecommendationResult(output, imageResults)
}
