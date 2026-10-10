/** Taste dimensions; the user picks 3–5 across two groups of five and rates each 1–10. */
export type TasteKey =
  | 'fruit'
  | 'sweet'
  | 'floral'
  | 'maltGrain'
  | 'nutty'
  | 'chocolateCoffee'
  | 'spice'
  | 'oak'
  | 'peat'
  | 'smoke'

/** Drinking-style dimensions, each asked and rated 1–10 on its own. */
export type StyleKey = 'body' | 'intensity' | 'smoothness'

/**
 * Only the 3–5 picked tastes, each rated by how pronounced it should be:
 * 1 淡淡帶到即可, 5 明顯感受得到, 10 希望成為主要風味 (integers).
 * A missing key means "not specified": it is never a low (1) or neutral (5) rating.
 */
export type TasteProfile = Partial<Record<TasteKey, number>>

/** body 1 輕盈–10 厚重, intensity 1 柔和–10 強烈, smoothness 1 粗獷–10 圓潤; always an integer. */
export type StyleProfile = Record<StyleKey, number>

export interface SommelierBudget {
  min?: number
  max?: number
}

/** Validated conversation output; the body of POST /api/v1/sommelier/preference. */
export interface SommelierInput {
  taste: TasteProfile
  style: StyleProfile
  /** Omitted for "no particular occasion". */
  occasion?: PreferenceOccasion
  budget?: Pick<SommelierBudget, 'max'>
  freeText?: string
}

/** One occasion, or 'none' for "no particular occasion". */
export type OccasionChoice = PreferenceOccasion | 'none'

/** Raw values from the conversation; a taste key is present once picked and starts at 5. */
export interface SommelierInputDraft {
  taste: TasteProfile
  style: StyleProfile
  /** null until the occasion question is answered. */
  occasion: OccasionChoice | null
  budget: number
  freeText: string
}

export type SommelierInputField = 'taste' | 'style' | 'occasion' | 'budget' | 'freeText'

export type SommelierInputErrors = Partial<Record<SommelierInputField, string>>

export type SommelierInputResult =
  | { ok: true; value: SommelierInput }
  | { ok: false; errors: SommelierInputErrors }

/** Picked in the conversation; an occasion stated in freeText overrides it. */
export type PreferenceOccasion =
  | 'relaxing'
  | 'tasting'
  | 'social'
  | 'meal'
  | 'date'
  | 'gift'
  | 'celebration'

/** Context the backend extracts from freeText. */
export type SommelierMood = 'positive' | 'neutral' | 'low' | 'stressed'

export type SommelierCompanion = 'alone' | 'friend' | 'date' | 'partner' | 'family'

/** Output of POST /api/v1/sommelier/preference: ratings as entered, plus budget and context. */
export interface Preference {
  taste: TasteProfile
  style: StyleProfile
  budget?: SommelierBudget
  occasion?: PreferenceOccasion
  mood?: SommelierMood
  companion?: SommelierCompanion
}

export interface PreferenceResponse {
  preference: Preference
}
