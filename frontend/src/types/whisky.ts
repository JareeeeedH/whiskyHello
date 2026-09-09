/**
 * Standardized Whisky model for Frontend (WhiskyHello v2).
 * Raw dataset fields must not leak into UI — use this shape only.
 */
export interface Whisky {
  id: string
  name: string
  subtitle?: string
  sgp?: string
  points?: number
  score?: string
  note?: string
  imageUrl?: string
}

/**
 * Raw Static Dataset record shape (legacy WhiskyFun scrape).
 * Do not mutate raw records; do not renumber ids.
 */
export interface RawWhisky {
  id: number | string
  NAME?: unknown
  SCORE?: unknown
  NOTE?: unknown
  IMAGE_PATH?: unknown
}

export interface WhiskySearchParams {
  /** Free-text query (legacy: searchContext). Space-split into title / subtitle tokens. */
  query: string
  /** Score threshold (legacy: searchPoints). Falsy (including 0) skips score filter. */
  points?: number | string | null
  /** When true, match points >= threshold; otherwise exact == (legacy pointGreaterThan). */
  pointGreaterThan?: boolean
}

export type WhiskySearchResult =
  | { status: 'too_short'; items: Whisky[] }
  | { status: 'ok'; items: Whisky[] }
