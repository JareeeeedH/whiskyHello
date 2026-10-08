import rawWhiskyIndex from '../data/generated/whiskyIndex.json'
import type {
  RawWhisky,
  Whisky,
  WhiskySearchParams,
  WhiskySearchResult,
} from '../types/whisky'
import { normalizeWhiskyDataset } from '../utils/whiskyNormalizer'
import { whiskyNoteChunkName } from '../utils/whiskyNoteChunk'
import { searchWhiskies as runSearch } from '../utils/whiskySearch'

/**
 * Whisky Service — Frontend Data Layer entry point.
 *
 * Raw Static Dataset
 *   ↓ (scripts/split-whisky-data.ts: index without notes + note chunks)
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

  cachedWhiskies = normalizeWhiskyDataset(rawWhiskyIndex as RawWhisky[])
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

type NoteChunk = Record<string, string>

const noteChunkLoaders = import.meta.glob<NoteChunk>('../data/generated/notes/*.json', {
  import: 'default',
})
const noteChunkCache = new Map<string, Promise<NoteChunk>>()

/** Tasting notes are not in the index; they load per chunk, only where needed. */
export async function getWhiskyNote(id: string): Promise<string | undefined> {
  const chunkName = whiskyNoteChunkName(String(id))
  const loader = noteChunkLoaders[`../data/generated/notes/${chunkName}.json`]
  if (!loader) {
    return undefined
  }

  let chunk = noteChunkCache.get(chunkName)
  if (!chunk) {
    chunk = loader()
    noteChunkCache.set(chunkName, chunk)
    chunk.catch(() => noteChunkCache.delete(chunkName))
  }
  return (await chunk)[String(id)]
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
