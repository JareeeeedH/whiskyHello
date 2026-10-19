/**
 * Turns one Static Dataset record into the text we embed for flavour search.
 *
 * One whisky becomes one chunk:
 *
 *   {name}
 *   Nose: …
 *   Mouth: …
 *   Finish: …
 *   Comments: …
 *
 * The intro (written before tasting) and Colour are left out. See WHISKY_RAG_SPEC.md §3.
 *
 * The section parser and the id / score normalizers come from the frontend, so the
 * chunks split notes and read scores exactly the way the whisky pages do.
 */
import { decodeHTML } from 'entities'
import {
  parseCriticReview,
  type CriticSectionKey,
} from '../../../frontend/src/utils/criticReviewParser.ts'
import { normalizeId, normalizeScore } from '../../../frontend/src/utils/whiskyNormalizer.ts'

interface ChunkSection {
  key: CriticSectionKey
  label: string
}

const CHUNK_SECTIONS: readonly ChunkSection[] = [
  { key: 'nose', label: 'Nose' },
  // The parser files Mouth, Mouth (neat), Palate and Taste under `palate`; the chunk always says Mouth.
  { key: 'palate', label: 'Mouth' },
  { key: 'finish', label: 'Finish' },
  { key: 'comments', label: 'Comments' },
]

/** One record of frontend/src/data/raw/whiskyDataset.json; every field may be missing or malformed. */
export interface RawWhiskyRecord {
  id?: unknown
  NAME?: unknown
  NOTE?: unknown
  SCORE?: unknown
}

export interface WhiskyChunk {
  whiskyId: string
  name: string
  /** The critic's score; absent when SCORE cannot be read as a number. */
  points?: number
  /** The exact text sent for embedding. */
  text: string
}

export type SkipReason = 'missing_id' | 'missing_name' | 'no_sections'

export type ChunkResult =
  | { status: 'ok'; chunk: WhiskyChunk }
  | { status: 'skipped'; whiskyId?: string; reason: SkipReason }

/**
 * Decodes HTML entities and collapses whitespace: `cr&egrave;me\n  brûlée` → `crème brûlée`.
 * Accents stay; embeddings compare meaning, not spelling.
 */
export function cleanText(value: string): string {
  return decodeHTML(value).replace(/\s+/g, ' ').trim()
}

export function buildChunk(record: RawWhiskyRecord): ChunkResult {
  const whiskyId = normalizeId(record.id)
  if (!whiskyId) {
    return { status: 'skipped', reason: 'missing_id' }
  }

  const name = typeof record.NAME === 'string' ? cleanText(record.NAME) : ''
  if (!name) {
    return { status: 'skipped', whiskyId, reason: 'missing_name' }
  }

  // Decode before parsing so the parser sees real characters, but keep the line breaks:
  // the parser also recognises a label written alone on its own line.
  const note = typeof record.NOTE === 'string' ? decodeHTML(record.NOTE) : ''
  const sections = parseCriticReview(note) ?? []

  const lines = CHUNK_SECTIONS.flatMap(({ key, label }) => {
    // A handful of notes repeat a label (for example two Nose parts); keep them all, in order.
    const content = sections
      .filter((section) => section.key === key)
      .map((section) => cleanText(section.content))
      .filter(Boolean)
      .join(' ')
    return content ? [`${label}: ${content}`] : []
  })

  if (lines.length === 0) {
    return { status: 'skipped', whiskyId, reason: 'no_sections' }
  }

  const { points } = normalizeScore(record.SCORE)
  return {
    status: 'ok',
    chunk: {
      whiskyId,
      name,
      ...(points === undefined ? {} : { points }),
      text: [name, ...lines].join('\n'),
    },
  }
}
