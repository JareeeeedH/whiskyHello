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
export const STYLE_KEYS = ['body', 'intensity', 'smoothness'] as const

/**
 * Every taste and style rating is an integer on this scale. For a taste it is how
 * pronounced it should be: 1 a light touch, 5 clearly noticeable, 10 the main flavor.
 */
export const PREFERENCE_SCALE_MIN = 1
export const PREFERENCE_SCALE_MAX = 10

/** Picked by the user in the conversation, or extracted from freeText. */
export const OCCASIONS = [
  'relaxing',
  'tasting',
  'social',
  'meal',
  'date',
  'gift',
  'celebration',
] as const

export const MOODS = ['positive', 'neutral', 'low', 'stressed'] as const

export const COMPANIONS = ['alone', 'friend', 'date', 'partner', 'family'] as const

export type TasteKey = (typeof TASTE_KEYS)[number]
export type StyleKey = (typeof STYLE_KEYS)[number]
export type Occasion = (typeof OCCASIONS)[number]
export type Mood = (typeof MOODS)[number]
export type Companion = (typeof COMPANIONS)[number]

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

/** Validated request body for POST /api/v1/sommelier/preference. */
export interface SommelierInput {
  taste: TasteProfile
  style: StyleProfile
  /** Omitted when the user picks "no particular occasion". */
  occasion?: Occasion
  budget?: PreferenceBudget
  freeText?: string
}

/** Context the LLM extracted from freeText, after backend validation dropped invalid values. */
export interface PreferenceExtraction {
  budget?: PreferenceBudget
  occasion?: Occasion
  mood?: Mood
  companion?: Companion
}

/** Final Preference: ratings as entered (unpicked tastes stay absent), plus budget, occasion and freeText context. */
export interface Preference {
  taste: TasteProfile
  style: StyleProfile
  budget?: PreferenceBudget
  occasion?: Occasion
  mood?: Mood
  companion?: Companion
}
