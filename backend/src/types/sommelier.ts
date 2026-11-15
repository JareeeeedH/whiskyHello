/** Longest message the user can send; long enough for a few sentences about taste. */
export const MESSAGE_MAX_LENGTH = 500

/** Validated request body for POST /api/v1/sommelier/recommendations. */
export interface SommelierInput {
  /** What the user wants, in their own words (usually Chinese). */
  message: string
}

/** One critic-note bottle, with why it suits the user's message. */
export interface WhiskyRecommendation {
  /** The site's whisky id; links to /whiskies/:id. */
  whiskyId: string
  whiskyName: string
  reason: string
  matches: string[]
  considerations: string[]
}

/**
 * `ok`: recommendations in rerank order, best first.
 * `off_topic`: the message is not asking for a whisky; `message` is a fixed hint, nothing is searched.
 */
export type RecommendationResult =
  | { status: 'ok'; recommendations: WhiskyRecommendation[] }
  | { status: 'off_topic'; message: string }
