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
import { buildEmbeddingSentence } from '../utils/flavourSentence'
import type { SearchResult } from '../utils/vectorSearch'
import { countLoadedVectors, searchByFlavour } from './flavourSearchService'
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
  const budget = input.budget && (input.budget.min !== undefined || input.budget.max !== undefined)
    ? input.budget
    : undefined
  return {
    taste: copyRatings(TASTE_KEYS, input.taste) as TasteProfile,
    style: copyRatings(STYLE_KEYS, input.style) as StyleProfile,
    ...(input.occasion ? { occasion: input.occasion } : {}),
    ...(budget ? { budget } : {}),
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

/**
 * The second pick: kept only when its whiskyId is one of the candidates and it has a reason.
 * Anything else gives null, so the user still gets the best match.
 */
function toCriticPick(raw: unknown, candidates: SearchResult[]): WhiskyRecommendation | null {
  if (!isPlainObject(raw)) {
    return null
  }
  const whiskyId = toText(raw.whiskyId)
  const candidate = candidates.find((item) => item.whiskyId === whiskyId)
  const reason = toText(raw.reason)
  if (!candidate || !reason || !Array.isArray(raw.matches) || !Array.isArray(raw.considerations)) {
    return null
  }
  return {
    type: 'alternative',
    whiskyName: candidate.name,
    reason,
    matches: toTextList(raw.matches),
    considerations: toTextList(raw.considerations),
    ...NO_IMAGE,
    whiskyId: candidate.whiskyId,
  }
}

/**
 * Validates raw LLM output (§4.5); anything that does not fit is a 502, never a partial
 * result. Photos are optional and fall back to null instead.
 */
export function toRecommendationResult(
  raw: unknown,
  imageResults: WebImageResult[] = [],
  candidates: SearchResult[] = [],
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
  const criticPick = toCriticPick(raw.criticPick, candidates)
  return { status: 'ok', recommendations: criticPick ? [bestMatch, criticPick] : [bestMatch] }
}

/** TEMP diagnostics for missing bottle photos; logs only whisky names, URLs and counts. Remove once diagnosed. */
function logPhotoOutcome(output: unknown, imageResults: WebImageResult[], result: RecommendationResult): void {
  if (result.status !== 'ok' || !isPlainObject(output)) {
    return
  }
  const item = result.recommendations[0]
  const aiUrl = isPlainObject(output.bestMatch) ? toText(output.bestMatch.imageUrl) : ''
  let outcome: string
  if (item.imageUrl) {
    outcome = `ok ${item.imageUrl}`
  } else if (!aiUrl) {
    outcome = 'AI returned no photo'
  } else {
    const basePath = aiUrl.split('?')[0]
    const nearMatch = imageResults.some((image) => image.imageUrl.split('?')[0] === basePath)
    outcome = `AI URL not in search results${nearMatch ? ' (same path, query differs)' : ''}: ${aiUrl.slice(0, 300)}`
  }
  console.info(`[sommelier photo] ${item.whiskyName}: ${outcome} (image results: ${imageResults.length})`)
}

/** Number of critic-note candidates the LLM chooses the second pick from. */
const CANDIDATE_COUNT = 5

/**
 * Finds the critic-note bottles closest to the user's preferences. Returns an empty list
 * when the vectors are not loaded or the search fails, so the best match still works.
 */
async function findCandidates(input: SommelierInput): Promise<SearchResult[]> {
  if (countLoadedVectors() === 0) {
    return []
  }
  try {
    return await searchByFlavour(buildEmbeddingSentence(input), CANDIDATE_COUNT)
  } catch (error) {
    console.error('Sommelier candidates unavailable:', error instanceof Error ? error.message : error)
    return []
  }
}

export async function recommendWhiskies(input: SommelierInput): Promise<RecommendationResult> {
  const candidates = await findCandidates(input)
  const llmInput = {
    preferences: toLLMInput(input),
    candidates: candidates.map((item) => ({ id: item.whiskyId, notes: item.text })),
  }
  const { output, imageResults } = await requestWhiskyRecommendations(JSON.stringify(llmInput))
  const result = toRecommendationResult(output, imageResults, candidates)
  logPhotoOutcome(output, imageResults, result)
  return result
}
