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
export type StyleKey = 'body'

/**
 * Only the 3–5 picked tastes, each rated by how pronounced it should be:
 * 1 淡淡帶到即可, 5 明顯感受得到, 10 希望成為主要風味 (integers).
 * A missing key means "not specified": it is never a low (1) or neutral (5) rating.
 */
export type TasteProfile = Partial<Record<TasteKey, number>>

/** body 1 輕盈–10 厚重; always an integer. */
export type StyleProfile = Record<StyleKey, number>

export interface SommelierBudget {
  min?: number
  max?: number
}

/**
 * Validated conversation output: shown as the preference profile, and the body
 * of POST /api/v1/sommelier/recommendations.
 */
export interface SommelierInput {
  taste: TasteProfile
  style: StyleProfile
  /** Omitted for "no particular occasion". */
  occasion?: PreferenceOccasion
  budget?: Pick<SommelierBudget, 'max'>
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
}

export type SommelierInputField = 'taste' | 'style' | 'occasion' | 'budget'

export type SommelierInputErrors = Partial<Record<SommelierInputField, string>>

export type SommelierInputResult =
  | { ok: true; value: SommelierInput }
  | { ok: false; errors: SommelierInputErrors }

/** Picked in the conversation. */
export type PreferenceOccasion =
  | 'relaxing'
  | 'tasting'
  | 'social'
  | 'meal'
  | 'date'
  | 'gift'
  | 'celebration'

export type RecommendationType = 'best_match' | 'alternative'

export interface WhiskyRecommendation {
  type: RecommendationType
  whiskyName: string
  reason: string
  matches: string[]
  considerations: string[]
  /** A bottle photo found by web search; null when none fits. */
  imageUrl: string | null
  /** The page the photo came from, kept for checking its source and licence. */
  imageSourceUrl: string | null
  /** Only on the alternative: the site's whisky id, for linking to /whiskies/:id. */
  whiskyId?: string
}

/** Output of POST /api/v1/sommelier/recommendations; `ok` lists best_match, then alternative when there is one. */
export type RecommendationResult =
  | { status: 'ok'; recommendations: WhiskyRecommendation[] }
  | { status: 'unable'; message?: string }
