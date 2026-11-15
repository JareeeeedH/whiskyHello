import mongoose from 'mongoose'
import type { RecommendationResult, SommelierInput, WhiskyRecommendation } from '../types/sommelier'
import { AppError } from '../utils/AppError'
import { dedupeByBaseName } from '../utils/dedupeWhiskies'
import { searchByFlavour, type SearchResult } from './flavourSearchService'
import {
  RECOMMENDATION_MALFORMED_MESSAGE,
  RECOMMENDATION_UNAVAILABLE_MESSAGE,
  requestSearchQuery,
  requestWhiskyRecommendations,
} from './openaiWhiskyRecommender'
import { rerankWithScores } from './rerankService'
import { saveSommelierLog } from './sommelierLogService'

/** Bottles taken from vector search; the reranker's picks often sit at 15th–30th place. */
const SEARCH_COUNT = 30

/** Bottles recommended to the user. */
const RECOMMENDATION_COUNT = 3

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function malformed(): AppError {
  return new AppError(502, RECOMMENDATION_MALFORMED_MESSAGE)
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Lists of short phrases: non-strings and blanks are dropped; anything but an array gives null. */
function toTextList(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  return value.map(toText).filter(Boolean)
}

/**
 * Fixed reply when the message is not asking for a whisky: fixed text, so it stays on
 * message and cannot be steered by prompt injection.
 */
export const OFF_TOPIC_MESSAGE = '目前只能幫你挑選威士忌。描述你想要的風味。'

export type QueryAnalysis = { intent: 'other' } | { intent: 'recommend'; searchQuery: string }

/**
 * The intent and rewritten English query. Off-topic needs no query; a recommendation
 * with a blank query cannot be searched, and anything else breaks the schema: both 502.
 */
export function toQueryAnalysis(raw: unknown): QueryAnalysis {
  if (isPlainObject(raw) && raw.intent === 'other') {
    return { intent: 'other' }
  }
  const searchQuery = isPlainObject(raw) && raw.intent === 'recommend' ? toText(raw.searchQuery) : ''
  if (!searchQuery) {
    console.error('Sommelier query analysis unusable: no intent or blank search query')
    throw malformed()
  }
  return { intent: 'recommend', searchQuery }
}

/**
 * Validates the LLM's cards against the candidates. A card is kept only when its whiskyId
 * is a candidate (once) and it has a reason; the name always comes from the candidate, never
 * the LLM. Cards follow the rerank order. No usable card at all is a 502.
 */
export function toRecommendationResult(
  raw: unknown,
  candidates: SearchResult[],
): Extract<RecommendationResult, { status: 'ok' }> {
  if (!isPlainObject(raw) || !Array.isArray(raw.recommendations)) {
    console.error('Sommelier cards unusable: no recommendations array')
    throw malformed()
  }

  const cards = new Map<string, WhiskyRecommendation>()
  for (const item of raw.recommendations) {
    if (!isPlainObject(item)) {
      continue
    }
    const whiskyId = toText(item.whiskyId)
    const candidate = candidates.find((entry) => entry.whiskyId === whiskyId)
    const reason = toText(item.reason)
    const matches = toTextList(item.matches)
    const considerations = toTextList(item.considerations)
    if (!candidate || cards.has(whiskyId) || !reason || !matches || !considerations) {
      continue
    }
    cards.set(whiskyId, { whiskyId, whiskyName: candidate.name, reason, matches, considerations })
  }

  const recommendations: WhiskyRecommendation[] = []
  for (const candidate of candidates) {
    const card = cards.get(candidate.whiskyId)
    if (card) {
      recommendations.push(card)
    }
  }
  if (recommendations.length === 0) {
    const ids = raw.recommendations.map((item) => (isPlainObject(item) ? String(item.whiskyId) : typeof item))
    console.error(`Sommelier cards unusable: got [${ids.join(', ')}], candidates [${candidates.map((c) => c.whiskyId).join(', ')}]`)
    throw malformed()
  }
  return { status: 'ok', recommendations }
}

/** What one request did, filled in step by step and saved to the query log at the end. */
interface RequestTrace {
  intent?: 'recommend' | 'other'
  searchQuery?: string
  candidateIds?: string[]
  picks?: { whiskyId: string; score: number }[]
  rerankFallback?: boolean
  recommendationIds?: string[]
  durations: { rewriteMs?: number; searchMs?: number; rerankMs?: number; cardsMs?: number }
}

/** Milliseconds since `started`. */
function since(started: number): number {
  return Date.now() - started
}

/**
 * Vector search for 30, one bottling per whisky, then the cross-encoder keeps the best 3.
 * Without the reranker the vector order is still a fair guess. Without a database or
 * search there is nothing to recommend, so that is a 503.
 */
async function findCandidates(searchQuery: string, trace: RequestTrace): Promise<SearchResult[]> {
  // Without a database the search would wait 10 s and fail; skip it, and the embedding call too.
  if (mongoose.connection.readyState !== 1) {
    throw new AppError(503, RECOMMENDATION_UNAVAILABLE_MESSAGE)
  }

  let found: SearchResult[]
  let started = Date.now()
  try {
    found = dedupeByBaseName(await searchByFlavour(searchQuery, SEARCH_COUNT))
  } catch (error) {
    console.error('Sommelier search unavailable:', error instanceof Error ? error.message : error)
    throw new AppError(503, RECOMMENDATION_UNAVAILABLE_MESSAGE)
  }
  trace.durations.searchMs = since(started)
  trace.candidateIds = found.map((item) => item.whiskyId)

  started = Date.now()
  try {
    const scored = await rerankWithScores(searchQuery, found, RECOMMENDATION_COUNT)
    trace.picks = scored.map((entry) => ({ whiskyId: entry.item.whiskyId, score: entry.score }))
    return scored.map((entry) => entry.item)
  } catch (error) {
    console.error('Sommelier rerank unavailable:', error instanceof Error ? error.message : error)
    trace.rerankFallback = true
    return found.slice(0, RECOMMENDATION_COUNT)
  } finally {
    trace.durations.rerankMs = since(started)
  }
}

let findCandidatesOverride: ((searchQuery: string) => Promise<SearchResult[]>) | null = null

/** Test-only hook: supplies the candidates without a database, embedding or reranker. */
export function setCandidateFinderForTests(
  finder: ((searchQuery: string) => Promise<SearchResult[]>) | null,
): void {
  findCandidatesOverride = finder
}

/**
 * message → intent + English search query (LLM) → vector search 30 → dedupe → rerank 3
 * → one Traditional Chinese card per bottle (LLM), grounded in its notes.
 * A message that is not asking for a whisky gets the fixed hint, with nothing searched.
 */
async function runRecommendation(input: SommelierInput, trace: RequestTrace): Promise<RecommendationResult> {
  let started = Date.now()
  const analysis = toQueryAnalysis(await requestSearchQuery(input.message))
  trace.durations.rewriteMs = since(started)
  trace.intent = analysis.intent
  if (analysis.intent === 'other') {
    return { status: 'off_topic', message: OFF_TOPIC_MESSAGE }
  }
  const { searchQuery } = analysis
  trace.searchQuery = searchQuery

  const candidates = findCandidatesOverride
    ? await findCandidatesOverride(searchQuery)
    : await findCandidates(searchQuery, trace)
  if (candidates.length === 0) {
    throw new AppError(503, RECOMMENDATION_UNAVAILABLE_MESSAGE)
  }

  const llmInput = {
    request: input.message,
    candidates: candidates.map((item) => ({ id: item.whiskyId, notes: item.text })),
  }
  started = Date.now()
  const output = await requestWhiskyRecommendations(JSON.stringify(llmInput))
  trace.durations.cardsMs = since(started)
  const result = toRecommendationResult(output, candidates)
  trace.recommendationIds = result.recommendations.map((item) => item.whiskyId)
  return result
}

/** Runs the recommendation and saves what happened to the query log, success or failure. */
export async function recommendWhiskies(
  input: SommelierInput,
  context: { loggedIn: boolean } = { loggedIn: false },
): Promise<RecommendationResult> {
  const started = Date.now()
  const trace: RequestTrace = { durations: {} }
  try {
    const result = await runRecommendation(input, trace)
    saveSommelierLog({
      message: input.message,
      loggedIn: context.loggedIn,
      status: result.status,
      ...trace,
      durations: { ...trace.durations, totalMs: since(started) },
    })
    return result
  } catch (error) {
    saveSommelierLog({
      message: input.message,
      loggedIn: context.loggedIn,
      status: 'error',
      ...trace,
      errorStatus: error instanceof AppError ? error.statusCode : 500,
      errorMessage: error instanceof AppError ? error.message : 'Unexpected error',
      durations: { ...trace.durations, totalMs: since(started) },
    })
    throw error
  }
}
