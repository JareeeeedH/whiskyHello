import { createHash } from 'node:crypto'
import { WhiskyTranslation } from '../models/WhiskyTranslation'
import type {
  PublicWhiskyTranslation,
  TranslationLanguage,
  WhiskyTranslationRequest,
} from '../types/translation'
import { AppError } from '../utils/AppError'
import { TRANSLATION_MALFORMED_MESSAGE, translateWhiskyNote } from './openaiWhiskyTranslator'

/**
 * A full translation is never this much shorter than the source. Chinese runs
 * at roughly a third to a half of the English character count, so anything
 * shorter than this is treated as a summary or a truncated answer.
 */
const MIN_LENGTH_RATIO = 0.15
/** Upper bound relative to the source, to reject runaway or padded answers. */
const MAX_LENGTH_RATIO = 3
const HAN_CHARACTER = /\p{Script=Han}/u
/** Numbers of two or more digits: years, ages, ABV, cask numbers, bottle counts, scores. */
const SIGNIFICANT_NUMBER = /\d{2,}(?:\.\d+)?/g
const THOUSANDS_SEPARATOR = /(\d),(?=\d{3}(?!\d))/g

type CachedTranslation = {
  whiskyId: string
  language: string
  translatedText: string
  createdAt: Date
}

/** Requests already waiting on OpenAI, so concurrent clicks share one call. */
const inFlight = new Map<string, Promise<PublicWhiskyTranslation>>()

export function hashSource(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function toPublicTranslation(doc: CachedTranslation, cached: boolean): PublicWhiskyTranslation {
  return {
    whiskyId: doc.whiskyId,
    language: doc.language as TranslationLanguage,
    translatedText: doc.translatedText,
    cached,
    createdAt: doc.createdAt.toISOString(),
  }
}

function significantNumbers(text: string): Set<string> {
  return new Set(text.replace(THOUSANDS_SEPARATOR, '$1').match(SIGNIFICANT_NUMBER) ?? [])
}

/** Source numbers that do not appear anywhere in the translation. */
export function findMissingNumbers(output: string, source: string): string[] {
  const translated = significantNumbers(output)
  return [...significantNumbers(source)].filter((number) => !translated.has(number))
}

/**
 * Rejects LLM output that cannot be a complete translation of `source`.
 * Paragraphs and line breaks may differ from the source (the translation can be
 * re-paragraphed into tasting blocks), so only content is checked, not layout.
 */
export function validateTranslatedText(output: string, source: string): string {
  const text = output.trim()
  const missingNumbers = findMissingNumbers(text, source)
  const valid =
    text.length > 0 &&
    HAN_CHARACTER.test(text) &&
    text.length >= source.length * MIN_LENGTH_RATIO &&
    text.length <= source.length * MAX_LENGTH_RATIO &&
    missingNumbers.length === 0
  if (!valid) {
    console.error(
      `OpenAI whisky translation rejected (source ${source.length} chars, output ${text.length} chars, missing numbers ${missingNumbers.length})`,
    )
    throw new AppError(502, TRANSLATION_MALFORMED_MESSAGE)
  }
  return text
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: number }).code === 11000)
}

async function findCached(
  whiskyId: string,
  language: TranslationLanguage,
  sourceHash: string,
): Promise<CachedTranslation | null> {
  return WhiskyTranslation.findOne({ whiskyId, language, sourceHash })
    .select({ whiskyId: 1, language: 1, translatedText: 1, createdAt: 1 })
    .lean<CachedTranslation>()
}

async function createTranslation(
  { whiskyId, language, text }: WhiskyTranslationRequest,
  sourceHash: string,
): Promise<PublicWhiskyTranslation> {
  const translatedText = validateTranslatedText(await translateWhiskyNote(text, language), text)

  try {
    const doc = await WhiskyTranslation.create({ whiskyId, language, sourceHash, translatedText })
    return toPublicTranslation(doc, false)
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error
    }
    // Another process stored the same translation first; serve that copy.
    const existing = await findCached(whiskyId, language, sourceHash)
    if (!existing) {
      throw error
    }
    return toPublicTranslation(existing, true)
  }
}

/**
 * Returns the cached translation of a critic note, or translates it once with
 * OpenAI and caches the result. The cache key includes a hash of the source
 * text, so a translation is only ever served for the exact note it was made from.
 */
export async function getWhiskyNoteTranslation(
  request: WhiskyTranslationRequest,
): Promise<PublicWhiskyTranslation> {
  const { whiskyId, language, text } = request
  const sourceHash = hashSource(text)

  const cached = await findCached(whiskyId, language, sourceHash)
  if (cached) {
    return toPublicTranslation(cached, true)
  }

  const key = `${whiskyId}:${language}:${sourceHash}`
  const pending = inFlight.get(key)
  if (pending) {
    return pending
  }

  const translation = createTranslation(request, sourceHash).finally(() => {
    inFlight.delete(key)
  })
  inFlight.set(key, translation)
  return translation
}
