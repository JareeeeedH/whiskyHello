/** Target languages for critic review translation. MVP: Traditional Chinese (Taiwan). */
export const TRANSLATION_LANGUAGES = ['zh-TW'] as const

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number]

/** Longest critic note we accept; the static dataset tops out at about 3,000 characters. */
export const TRANSLATION_SOURCE_MAX_LENGTH = 5000

/** POST /api/v1/whisky-translations body after validation. */
export interface WhiskyTranslationRequest {
  whiskyId: string
  language: TranslationLanguage
  text: string
}

export interface PublicWhiskyTranslation {
  whiskyId: string
  language: TranslationLanguage
  translatedText: string
  /** true when served from the translation cache without calling OpenAI. */
  cached: boolean
  createdAt: string
}
