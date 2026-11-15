/** Body of POST /api/v1/sommelier/recommendations. */
export interface SommelierInput {
  /** What the user wants, in their own words; 1–500 characters after trimming. */
  message: string
}

/** One critic-note bottle, with why it suits the user's message. */
export interface WhiskyRecommendation {
  /** The site's whisky id, for linking to /whiskies/:id. */
  whiskyId: string
  whiskyName: string
  reason: string
  matches: string[]
  considerations: string[]
}

/**
 * Output of POST /api/v1/sommelier/recommendations. `ok`: 1–3 bottles, best match first.
 * `off_topic`: the message was not asking for a whisky; `message` is a fixed hint.
 */
export type RecommendationResult =
  | { status: 'ok'; recommendations: WhiskyRecommendation[] }
  | { status: 'off_topic'; message: string }
