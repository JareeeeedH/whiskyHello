import type { Whisky, WhiskySearchParams, WhiskySearchResult } from '../types/whisky.ts'

/** Minimum search length, counted after spaces are removed. */
export const MIN_WHISKY_SEARCH_LENGTH = 3

/** Ways of writing an age that the dataset stores as "yo". */
const AGE_WORDS = new Set(['y', 'yr', 'yrs', 'year', 'years'])

/** Words users add that say nothing about which bottle they want. */
const FILLER_WORDS = new Set(['old', 'the', 'whisky', 'whiskey', 'scotch', 'single', 'malt'])

const LETTERS_ONLY = /^[a-z]+$/
const DIGITS_ONLY = /^\d+$/

interface IndexedWhisky {
  whisky: Whisky
  nameTokens: string[]
  tokens: string[]
}

interface SearchIndex {
  entries: IndexedWhisky[]
  /** Letter tokens seen in the dataset, used to split run-together words. */
  vocabulary: Set<string>
}

const indexCache = new WeakMap<Whisky[], SearchIndex>()

/**
 * Lowercase, drop accents and punctuation, and split letters from digits,
 * so "Macallan 12 yo", "macallan12yo" and "MACALLAN-12" all become the same tokens.
 */
function toSearchTokens(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/years?old/g, 'yo ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map((token) => (AGE_WORDS.has(token) ? 'yo' : token))
}

function getIndex(dataList: Whisky[]): SearchIndex {
  const cached = indexCache.get(dataList)
  if (cached) {
    return cached
  }

  const vocabulary = new Set<string>()
  const entries = dataList.map((whisky) => {
    const nameTokens = toSearchTokens(whisky.name)
    const tokens = [...nameTokens, ...toSearchTokens(whisky.subtitle ?? '')]
    for (const token of tokens) {
      if (token.length >= 2 && LETTERS_ONLY.test(token)) {
        vocabulary.add(token)
      }
    }
    return { whisky, nameTokens, tokens }
  })

  const index = { entries, vocabulary }
  indexCache.set(dataList, index)
  return index
}

/**
 * Numbers must equal a whole token ("10" never matches "1074").
 * Letters must start at a token and may run across the following tokens,
 * so "ard" matches "Ardbeg" (not "Cardhu") and "highlandpark" matches "Highland Park".
 */
function matchesWord(tokens: string[], word: string): boolean {
  if (DIGITS_ONLY.test(word)) {
    return tokens.includes(word)
  }

  for (let start = 0; start < tokens.length; start += 1) {
    let joined = ''
    for (let end = start; end < tokens.length && joined.length < word.length; end += 1) {
      joined += tokens[end]!
      if (joined.startsWith(word)) {
        return true
      }
      if (!word.startsWith(joined)) {
        break
      }
    }
  }
  return false
}

function matchesAll(tokens: string[], words: string[]): boolean {
  return words.every((word) => matchesWord(tokens, word))
}

/** "glen livet" → "glenlivet" */
function mergeLetterWords(words: string[]): string[] {
  const merged: string[] = []
  for (const word of words) {
    const last = merged[merged.length - 1]
    if (last !== undefined && LETTERS_ONLY.test(last) && LETTERS_ONLY.test(word)) {
      merged[merged.length - 1] = last + word
    } else {
      merged.push(word)
    }
  }
  return merged
}

/** "macallansherryoak" → ["macallan", "sherry", "oak"], using the fewest known tokens. */
function splitRunTogether(word: string, vocabulary: Set<string>): string[] | null {
  const best: (string[] | undefined)[] = [[]]
  for (let start = 0; start < word.length; start += 1) {
    const prefix = best[start]
    if (!prefix) continue
    for (let end = start + 2; end <= word.length; end += 1) {
      const piece = word.slice(start, end)
      const current = best[end]
      if (vocabulary.has(piece) && (!current || current.length > prefix.length + 1)) {
        best[end] = [...prefix, piece]
      }
    }
  }
  const pieces = best[word.length]
  return pieces && pieces.length > 1 ? pieces : null
}

function splitWords(words: string[], vocabulary: Set<string>): string[] {
  return words.flatMap((word) =>
    LETTERS_ONLY.test(word) && !vocabulary.has(word)
      ? (splitRunTogether(word, vocabulary) ?? [word])
      : [word],
  )
}

/** Name matches first, then subtitle-only matches; higher points first within each group. */
function rank(entries: IndexedWhisky[], words: string[]): Whisky[] {
  return entries
    .map((entry) => ({ entry, inName: matchesAll(entry.nameTokens, words) }))
    .sort(
      (a, b) =>
        Number(b.inName) - Number(a.inName) ||
        (b.entry.whisky.points ?? -1) - (a.entry.whisky.points ?? -1),
    )
    .map(({ entry }) => entry.whisky)
}

/**
 * Public search entry used by Whisky Service.
 * Every query word must match the whisky name or subtitle, in any order.
 * When nothing matches in a name, retry with merged words ("glen livet")
 * and then with split words ("macallansherryoak").
 */
export function searchWhiskies(
  dataList: Whisky[],
  params: WhiskySearchParams,
): WhiskySearchResult {
  const query = params.query ?? ''

  if (query.replace(/\s/g, '').length < MIN_WHISKY_SEARCH_LENGTH) {
    return { status: 'too_short', items: [] }
  }

  const words = toSearchTokens(query).filter((word) => !FILLER_WORDS.has(word))
  if (words.join('').length < MIN_WHISKY_SEARCH_LENGTH) {
    return { status: 'ok', items: [] }
  }

  const { entries, vocabulary } = getIndex(dataList)
  const filterBy = (ws: string[]) => entries.filter((entry) => matchesAll(entry.tokens, ws))
  const hasNameMatch = (matched: IndexedWhisky[], ws: string[]) =>
    matched.some((entry) => matchesAll(entry.nameTokens, ws))

  const direct = filterBy(words)
  if (hasNameMatch(direct, words)) {
    return { status: 'ok', items: rank(direct, words) }
  }

  const retries = [mergeLetterWords(words), splitWords(words, vocabulary)].filter(
    (retry) => retry.join(' ') !== words.join(' '),
  )

  for (const retry of retries) {
    const matched = filterBy(retry)
    if (hasNameMatch(matched, retry)) {
      return { status: 'ok', items: rank(matched, retry) }
    }
  }

  if (direct.length > 0) {
    return { status: 'ok', items: rank(direct, words) }
  }

  for (const retry of retries) {
    const matched = filterBy(retry)
    if (matched.length > 0) {
      return { status: 'ok', items: rank(matched, retry) }
    }
  }

  return { status: 'ok', items: [] }
}
