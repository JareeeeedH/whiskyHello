/** Taste dimensions rated by the user, in the order the UI asks them. */
export const TASTE_KEYS = [
  'sweet',
  'fruit',
  'driedFruit',
  'citrus',
  'floral',
  'vanillaCaramel',
  'nutty',
  'chocolateCoffee',
  'spice',
  'oak',
  'peat',
  'smoke',
] as const

/** The UI shows the taste keys in two groups of six; the user picks and rates 3 from each. */
export const TASTE_GROUPS = [TASTE_KEYS.slice(0, 6), TASTE_KEYS.slice(6)] as const
export const TASTE_PICKS_PER_GROUP = 3

/** Drinking-style dimensions rated by the user. */
export const STYLE_KEYS = ['body', 'intensity', 'smoothness'] as const

/** Every taste and style rating is an integer on this scale (1 = least, 10 = most). */
export const PREFERENCE_SCALE_MIN = 1
export const PREFERENCE_SCALE_MAX = 10

export const OCCASIONS = [
  'relaxing',
  'social',
  'meal',
  'gift',
  'beginner',
  'premium',
  'date',
] as const

export const MOODS = ['positive', 'neutral', 'low', 'stressed'] as const

export const COMPANIONS = ['alone', 'friend', 'date', 'partner', 'family'] as const

export type TasteKey = (typeof TASTE_KEYS)[number]
export type StyleKey = (typeof STYLE_KEYS)[number]
export type Occasion = (typeof OCCASIONS)[number]
export type Mood = (typeof MOODS)[number]
export type Companion = (typeof COMPANIONS)[number]

/**
 * Only the tastes the user picked and rated. A missing key means "not provided":
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

/** Final Preference: ratings as entered (unpicked tastes stay absent), plus budget and freeText context. */
export interface Preference {
  taste: TasteProfile
  style: StyleProfile
  budget?: PreferenceBudget
  occasion?: Occasion
  mood?: Mood
  companion?: Companion
}
