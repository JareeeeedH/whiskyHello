import type { RawWhisky, Whisky } from '../types/whisky'

/** Legacy CDN root used by whsfun-ui dataMap(). */
export const WHISKY_IMAGE_SRC_ROOT =
  'https://raw.githubusercontent.com/JareeeeedH/fundata/master/whiskyfun/'

function asTrimmedString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return undefined
}

/**
 * NAME → name / subtitle
 * Legacy: split on " (" ; subtitle = "(" + remainder
 * Defensive: missing parenthesis → name only, no "(undefined"
 */
export function normalizeName(rawName: unknown): {
  name: string
  subtitle?: string
} {
  const nameText = asTrimmedString(rawName)
  if (!nameText) {
    return { name: '' }
  }

  const parts = nameText.split(' (')
  const name = parts[0] ?? ''
  if (parts.length < 2 || parts[1] === undefined) {
    return { name }
  }

  return {
    name,
    subtitle: `(${parts[1]}`,
  }
}

/**
 * SCORE → sgp / points / score
 * Legacy fallbacks (preserved):
 * 1) split on " - "
 * 2) else split on double space "  "
 * 3) strip " points"
 * 4) else treat as unparseable (legacy used string "NaN")
 *
 * v2 stores points as number | undefined (unparseable → undefined),
 * which keeps the same search exclusion behavior via Number comparisons.
 */
export function normalizeScore(rawScore: unknown): {
  sgp?: string
  points?: number
  score?: string
} {
  const score = asTrimmedString(rawScore)
  if (!score) {
    return {}
  }

  let sgp: string | undefined
  let pointsText: string | undefined

  const dashSplit = score.split(' - ')
  sgp = dashSplit[0]
  pointsText = dashSplit[1]

  // Legacy typeTwoScoreSplit fallback
  if (!pointsText) {
    const doubleSpaceSplit = score.split('  ')
    pointsText = doubleSpaceSplit[1]
  }

  if (pointsText) {
    pointsText = pointsText.replace(' points', '')
  }

  if (!pointsText) {
    return { sgp, score }
  }

  const points = Number(pointsText.trim())
  if (Number.isFinite(points)) {
    return { sgp, points, score }
  }

  // Non-numeric remnants (e.g. "around 65") — same as legacy: score filters skip them
  return { sgp, score }
}

/**
 * IMAGE_PATH → imageUrl
 * Legacy: ignore Material* folder; use filename[0]/filename under whiskyfun CDN.
 * Defensive: malformed / missing path → undefined (do not crash dataset processing).
 */
export function normalizeImageUrl(rawPath: unknown): string | undefined {
  const imagePath = asTrimmedString(rawPath)
  if (!imagePath) {
    return undefined
  }

  try {
    const segments = imagePath.split('/')
    const fileName = segments[1]
    if (!fileName) {
      return undefined
    }

    const folderLetter = fileName.charAt(0)
    if (!folderLetter) {
      return undefined
    }

    return `${WHISKY_IMAGE_SRC_ROOT}${folderLetter}/${fileName}`
  } catch {
    return undefined
  }
}

export function normalizeNote(rawNote: unknown): string | undefined {
  const note = asTrimmedString(rawNote)
  if (note === undefined || note === '') {
    return undefined
  }
  return note
}

/**
 * Preserve original id as stable string. Never renumber.
 */
export function normalizeId(rawId: unknown): string | undefined {
  if (rawId === null || rawId === undefined) {
    return undefined
  }
  if (typeof rawId === 'number' && Number.isFinite(rawId)) {
    return String(rawId)
  }
  if (typeof rawId === 'string' && rawId.trim() !== '') {
    return rawId.trim()
  }
  return undefined
}

/**
 * Normalize one raw record. Returns null if id is missing (cannot be a stable whisky).
 * Single-record failures must not abort batch processing.
 */
export function normalizeWhisky(raw: RawWhisky | null | undefined): Whisky | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const id = normalizeId(raw.id)
  if (!id) {
    return null
  }

  const { name, subtitle } = normalizeName(raw.NAME)
  const { sgp, points, score } = normalizeScore(raw.SCORE)
  const note = normalizeNote(raw.NOTE)
  const imageUrl = normalizeImageUrl(raw.IMAGE_PATH)

  const whisky: Whisky = { id, name }

  if (subtitle !== undefined) whisky.subtitle = subtitle
  if (sgp !== undefined) whisky.sgp = sgp
  if (points !== undefined) whisky.points = points
  if (score !== undefined) whisky.score = score
  if (note !== undefined) whisky.note = note
  if (imageUrl !== undefined) whisky.imageUrl = imageUrl

  return whisky
}

/**
 * Normalize the full raw dataset. Skips invalid rows without throwing.
 */
export function normalizeWhiskyDataset(rawList: unknown): Whisky[] {
  if (!Array.isArray(rawList)) {
    return []
  }

  const result: Whisky[] = []
  for (const item of rawList) {
    try {
      const whisky = normalizeWhisky(item as RawWhisky)
      if (whisky) {
        result.push(whisky)
      }
    } catch {
      // Skip malformed row — do not crash the whole dataset.
    }
  }
  return result
}
