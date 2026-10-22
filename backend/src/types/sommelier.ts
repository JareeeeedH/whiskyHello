/** Taste dimensions, in the order the UI shows them. */
export const TASTE_KEYS = [
  'fruit',
  'sweet',
  'floral',
  'maltGrain',
  'nutty',
  'chocolateCoffee',
  'spice',
  'oak',
  'peat',
  'smoke',
] as const

/** The user picks this many tastes in total, then rates how pronounced each should be. */
export const TASTE_PICKS_MIN = 3
export const TASTE_PICKS_MAX = 5

/** Drinking-style dimensions rated by the user. */
export const STYLE_KEYS = ['body'] as const

/**
 * Every taste and style rating is an integer on this scale. For a taste it is how
 * pronounced it should be: 1 a light touch, 5 clearly noticeable, 10 the main flavor.
 */
export const PREFERENCE_SCALE_MIN = 1
export const PREFERENCE_SCALE_MAX = 10

/** Picked by the user in the conversation. */
export const OCCASIONS = [
  'relaxing',
  'tasting',
  'social',
  'meal',
  'date',
  'gift',
  'celebration',
] as const

export type TasteKey = (typeof TASTE_KEYS)[number]
export type StyleKey = (typeof STYLE_KEYS)[number]
export type Occasion = (typeof OCCASIONS)[number]

/**
 * Only the 3–5 tastes the user picked and rated. A missing key means "not specified":
 * it is never a low (1) or neutral (5) rating.
 */
export type TasteProfile = Partial<Record<TasteKey, number>>
export type StyleProfile = Record<StyleKey, number>

export interface PreferenceBudget {
  min?: number
  max?: number
}

/** Validated request body for POST /api/v1/sommelier/recommendations. */
export interface SommelierInput {
  taste: TasteProfile
  style: StyleProfile
  /** Omitted when the user picks "no particular occasion". */
  occasion?: Occasion
  budget?: PreferenceBudget
}

export type RecommendationType = 'best_match' | 'alternative'

export interface WhiskyRecommendation {
  type: RecommendationType
  whiskyName: string
  reason: string
  matches: string[]
  considerations: string[]
  /** An image_url the web search returned for this bottle; null when none fits. */
  imageUrl: string | null
  /** The page the photo was found on, kept for checking its source and licence. */
  imageSourceUrl: string | null
  /** Only on the alternative: the site's whisky id, picked from the critic-note candidates. */
  whiskyId?: string
}

/** `ok` carries best_match, then the alternative when one was picked; `unable` means no confident best_match. */
export type RecommendationResult =
  | { status: 'ok'; recommendations: WhiskyRecommendation[] }
  | { status: 'unable'; message?: string }
