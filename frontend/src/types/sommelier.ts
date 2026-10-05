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

/** Normalized Step 1 output (§3.2); the input for Step 2 Preference Extraction. */
export interface SommelierInput {
  taste: FlavorTag[]
  dislikes: FlavorTag[]
  budget?: SommelierBudget
  occasion?: SommelierOccasion
  freeText?: string
}

/** Raw Step 1 form values before validation and normalization. */
export interface SommelierInputDraft {
  taste: readonly string[]
  dislikes: readonly string[]
  budgetMin: number | null
  budgetMax: number | null
  occasion: string | null
  freeText: string
}

export type SommelierInputField = 'taste' | 'dislikes' | 'budget' | 'occasion' | 'freeText'

export type SommelierInputErrors = Partial<Record<SommelierInputField, string>>

export type SommelierInputResult =
  | { ok: true; value: SommelierInput }
  | { ok: false; errors: SommelierInputErrors }
