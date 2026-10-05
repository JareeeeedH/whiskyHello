/** Allowed values from WHISKYHELLO_AI_SOMMELIER_SPEC.md (§2.1, §2.2, §4.3–§4.6). */
export const FLAVOR_TAGS = [
  'sweet',
  'fruity',
  'floral',
  'vanilla',
  'woody',
  'spicy',
  'smoky',
  'peaty',
  'maritime',
] as const

export const TASTE_LEVELS = ['low', 'medium', 'high'] as const

export const STEP1_OCCASIONS = [
  'relaxing',
  'social',
  'meal',
  'gift',
  'beginner',
  'premium',
] as const

/** `date` can only come from freeText extraction, never from the Step 1 form. */
export const PREFERENCE_OCCASIONS = [...STEP1_OCCASIONS, 'date'] as const

export const MOODS = ['positive', 'neutral', 'low', 'stressed'] as const

export const COMPANIONS = ['alone', 'friend', 'date', 'partner', 'family'] as const

export type FlavorTag = (typeof FLAVOR_TAGS)[number]
export type TasteLevel = (typeof TASTE_LEVELS)[number]
export type Step1Occasion = (typeof STEP1_OCCASIONS)[number]
export type PreferenceOccasion = (typeof PREFERENCE_OCCASIONS)[number]
export type Mood = (typeof MOODS)[number]
export type Companion = (typeof COMPANIONS)[number]

export interface PreferenceBudget {
  min?: number
  max?: number
}

export const INTENSITY_MIN = 0
export const INTENSITY_MAX = 100

/** Peat and smoke intensity on a 0–100 scale (§2.5). */
export interface PreferenceIntensity {
  peaty?: number
  smoky?: number
}

/** Validated Step 1 input (§3.2); validation defaults a missing `dislikes` to []. */
export interface SommelierInput {
  taste: FlavorTag[]
  dislikes: FlavorTag[]
  intensity?: PreferenceIntensity
  budget?: PreferenceBudget
  occasion?: Step1Occasion
  freeText?: string
}

export interface PreferenceTaste {
  tag: FlavorTag
  level: TasteLevel
}

/** LLM extraction after backend validation; invalid values have already been dropped (§4.7). */
export interface PreferenceExtraction {
  taste: PreferenceTaste[]
  dislikes: FlavorTag[]
  budget?: PreferenceBudget
  occasion?: PreferenceOccasion
  mood?: Mood
  companion?: Companion
}

/** Step 2 output (§4.9). */
export interface Preference {
  taste: PreferenceTaste[]
  dislikes: FlavorTag[]
  intensity?: PreferenceIntensity
  budget?: PreferenceBudget
  occasion?: PreferenceOccasion
  mood?: Mood
  companion?: Companion
}
