/** Flavor tags shared by Step 1 `taste` and `dislikes` (WHISKYHELLO_AI_SOMMELIER_SPEC.md §2.1). */
export type FlavorTag =
  | 'sweet'
  | 'fruity'
  | 'floral'
  | 'vanilla'
  | 'woody'
  | 'spicy'
  | 'smoky'
  | 'peaty'
  | 'maritime'

/** Step 1 occasions (§2.2). `date` is extraction-only in Step 2 and not offered here. */
export type SommelierOccasion =
  | 'relaxing'
  | 'social'
  | 'meal'
  | 'gift'
  | 'beginner'
  | 'premium'

export interface SommelierBudget {
  min?: number
  max?: number
}

/** Peat and smoke intensity on a 0–100 scale (§2.5), as returned in a Preference. */
export interface SommelierIntensity {
  peaty?: number
  smoky?: number
}

/** Normalized Step 1 output (§3.1); the input for Step 2 Preference Extraction. */
export interface SommelierInput {
  taste: FlavorTag[]
  intensity: {
    peaty: number
    smoky: number
  }
  budget?: Pick<SommelierBudget, 'max'>
  freeText?: string
}

/** Raw values from the conversational Step 1 (§2.6) before validation and normalization. */
export interface SommelierInputDraft {
  taste: readonly string[]
  peaty: number
  smoky: number
  budget: number
  freeText: string
}

export type SommelierInputField = 'taste' | 'intensity' | 'budget' | 'freeText'

export type SommelierInputErrors = Partial<Record<SommelierInputField, string>>

export type SommelierInputResult =
  | { ok: true; value: SommelierInput }
  | { ok: false; errors: SommelierInputErrors }

export type TasteLevel = 'low' | 'medium' | 'high'

/** Step 2 occasions (§4.4): Step 1 occasions plus `date`, which only comes from freeText. */
export type PreferenceOccasion = SommelierOccasion | 'date'

export type SommelierMood = 'positive' | 'neutral' | 'low' | 'stressed'

export type SommelierCompanion = 'alone' | 'friend' | 'date' | 'partner' | 'family'

export interface PreferenceTaste {
  tag: FlavorTag
  level: TasteLevel
}

/** Step 2 output from POST /api/v1/sommelier/preference (§4.9). */
export interface Preference {
  taste: PreferenceTaste[]
  dislikes: FlavorTag[]
  intensity?: SommelierIntensity
  budget?: SommelierBudget
  occasion?: PreferenceOccasion
  mood?: SommelierMood
  companion?: SommelierCompanion
}

export interface PreferenceResponse {
  preference: Preference
}
