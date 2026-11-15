import { InferSchemaType, Schema, model } from 'mongoose'

export const SOMMELIER_LOG_STATUSES = ['ok', 'off_topic', 'error'] as const

/** One reranked bottle and its cross-encoder score. */
const pickSchema = new Schema(
  {
    whiskyId: { type: String, required: true },
    score: { type: Number, required: true },
  },
  { _id: false },
)

/** How long each step took, in milliseconds; a step that did not run is absent. */
const durationsSchema = new Schema(
  {
    rewriteMs: Number,
    searchMs: Number,
    rerankMs: Number,
    cardsMs: Number,
    totalMs: { type: Number, required: true },
  },
  { _id: false },
)

/**
 * One Sommelier request, kept to study real questions and find which step went wrong.
 * No account, IP or token is stored; only whether the user was logged in.
 * See WHISKYHELLO_AI_SOMMELIER_SPEC.md §6.
 */
const sommelierLogSchema = new Schema(
  {
    /** The message as the user sent it (validated, trimmed). */
    message: { type: String, required: true },
    loggedIn: { type: Boolean, required: true },
    status: { type: String, required: true, enum: [...SOMMELIER_LOG_STATUSES] },
    /** Absent when the request failed before the intent was known. */
    intent: { type: String, enum: ['recommend', 'other'] },
    searchQuery: String,
    /** Vector search results after dedupe, best first (up to 30). */
    candidateIds: { type: [String], default: undefined },
    /** Reranked top picks with scores; absent when the reranker was unavailable. */
    picks: { type: [pickSchema], default: undefined },
    /** True when the reranker failed and the vector order was used instead. */
    rerankFallback: Boolean,
    /** The whiskies shown on the cards, in order. */
    recommendationIds: { type: [String], default: undefined },
    /** For errors: the HTTP status sent and its message, never provider details. */
    errorStatus: Number,
    errorMessage: String,
    durations: { type: durationsSchema, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
)

sommelierLogSchema.index({ createdAt: -1 })

export type SommelierLogFields = InferSchemaType<typeof sommelierLogSchema>

export const SommelierLog = model('SommelierLog', sommelierLogSchema, 'sommelierlogs')
