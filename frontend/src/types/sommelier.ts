/** Taste dimensions; the user picks 3 of each group of six and rates them 1–10. */
export type TasteKey =
  | 'sweet'
  | 'fruit'
  | 'driedFruit'
  | 'citrus'
  | 'floral'
  | 'vanillaCaramel'
  | 'nutty'
  | 'chocolateCoffee'
  | 'spice'
  | 'oak'
  | 'peat'
  | 'smoke'

/** Drinking-style dimensions, each asked and rated 1–10 on its own. */
export type StyleKey = 'body' | 'intensity' | 'smoothness'

/**
 * Only the picked tastes, rated 1 = 幾乎不喜歡 … 10 = 非常喜歡 (integers).
 * A missing key means "not provided": it is never a low (1) or neutral (5) rating.
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
  budget?: Pick<SommelierBudget, 'max'>
  freeText?: string
}

/** Raw values from the conversation; a taste key is present once picked and starts at 5. */
export interface SommelierInputDraft {
  taste: TasteProfile
  style: StyleProfile
  budget: number
  freeText: string
}

export type SommelierInputField = 'taste' | 'style' | 'budget' | 'freeText'

export type SommelierInputErrors = Partial<Record<SommelierInputField, string>>

export type SommelierInputResult =
  | { ok: true; value: SommelierInput }
  | { ok: false; errors: SommelierInputErrors }

/** Context the backend extracts from freeText. */
export type PreferenceOccasion =
  | 'relaxing'
  | 'social'
  | 'meal'
  | 'gift'
  | 'beginner'
  | 'premium'
  | 'date'

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
