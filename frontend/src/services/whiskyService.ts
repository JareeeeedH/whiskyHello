import rawWhiskyDataset from '../data/raw/whiskyDataset.json'
import type {
  RawWhisky,
  Whisky,
  WhiskySearchParams,
  WhiskySearchResult,
} from '../types/whisky'
import { normalizeWhiskyDataset } from '../utils/whiskyNormalizer'
import { searchWhiskies as runSearch } from '../utils/whiskySearch'

/**
 * Whisky Service — Frontend Data Layer entry point.
 *
 * Raw Static Dataset
 *   ↓
 * Normalization (once, cached)
 *   ↓
 * Standardized Whisky[]
 *   ↓
 * getWhiskies / getWhiskyById / searchWhiskies
 *
 * Vue components must use this service; do not import the raw dataset.
 */

let cachedWhiskies: Whisky[] | null = null
let cachedById: Map<string, Whisky> | null = null

function loadWhiskies(): Whisky[] {
  if (cachedWhiskies) {
    return cachedWhiskies
  }

  cachedWhiskies = normalizeWhiskyDataset(rawWhiskyDataset as RawWhisky[])
  cachedById = new Map(cachedWhiskies.map((item) => [item.id, item]))
  return cachedWhiskies
}

function getIndex(): Map<string, Whisky> {
  loadWhiskies()
  return cachedById ?? new Map()
}

export function getWhiskies(): Whisky[] {
  return loadWhiskies()
}

export function getWhiskyById(id: string): Whisky | undefined {
  if (!id) {
    return undefined
  }
  return getIndex().get(String(id))
}

export function searchWhiskies(params: WhiskySearchParams): WhiskySearchResult {
  return runSearch(loadWhiskies(), params)
}

/**
 * Random sample for browse carousel (legacy WhiskyView).
 * Uses floor index to avoid out-of-range undefined entries.
 */
export function getRandomWhiskies(count = 10): Whisky[] {
  const all = loadWhiskies()
  if (all.length === 0 || count <= 0) {
    return []
  }

  const result: Whisky[] = []
  const safeCount = Math.min(count, all.length)

  for (let i = 0; i < safeCount; i += 1) {
    const index = Math.floor(Math.random() * all.length)
    result.push(all[index]!)
  }

  return result
}
