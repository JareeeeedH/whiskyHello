/** Target language for critic review translation (backend `TRANSLATION_LANGUAGES`). */
export type TranslationLanguage = 'zh-TW'

/** POST /api/v1/whisky-translations body. */
export interface WhiskyTranslationRequest {
  whiskyId: string
  language: TranslationLanguage
  text: string
}

export interface WhiskyTranslation {
  whiskyId: string
  language: TranslationLanguage
  translatedText: string
  cached: boolean
  createdAt: string
}

export interface WhiskyTranslationResponse {
  translation: WhiskyTranslation
}
