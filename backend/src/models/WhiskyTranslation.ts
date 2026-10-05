import { HydratedDocument, InferSchemaType, Model, Schema, model } from 'mongoose'
import { TRANSLATION_LANGUAGES } from '../types/translation'

/**
 * Translation cache for Static Dataset critic notes (never user reviews).
 * The original note stays in the static dataset; only the translation is stored.
 */
const whiskyTranslationSchema = new Schema(
  {
    whiskyId: {
      type: String,
      required: [true, 'Whisky id is required'],
      trim: true,
    },
    language: {
      type: String,
      required: [true, 'Language is required'],
      enum: [...TRANSLATION_LANGUAGES],
    },
    /** SHA-256 of the source note the translation was made from. */
    sourceHash: {
      type: String,
      required: [true, 'Source hash is required'],
    },
    translatedText: {
      type: String,
      required: [true, 'Translated text is required'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

whiskyTranslationSchema.index({ whiskyId: 1, language: 1, sourceHash: 1 }, { unique: true })

export type WhiskyTranslationSchemaFields = InferSchemaType<typeof whiskyTranslationSchema>

export type WhiskyTranslationDocument = HydratedDocument<WhiskyTranslationSchemaFields>

export type WhiskyTranslationModel = Model<WhiskyTranslationSchemaFields>

export const WhiskyTranslation = model<WhiskyTranslationSchemaFields, WhiskyTranslationModel>(
  'WhiskyTranslation',
  whiskyTranslationSchema,
)
