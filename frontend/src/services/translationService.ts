import axios from 'axios'
import { apiClient } from '../api/client'
import type {
  WhiskyTranslation,
  WhiskyTranslationRequest,
  WhiskyTranslationResponse,
} from '../types/translation'

/** Upper bound on the wait; the backend caps each OpenAI attempt at 45 seconds. */
const TRANSLATION_REQUEST_TIMEOUT_MS = 100_000

export class TranslationApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'TranslationApiError'
    this.status = status
  }
}

function toTranslationApiError(error: unknown): TranslationApiError {
  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status

    if (status === 400) {
      return new TranslationApiError(400, '這段評論無法翻譯')
    }
    if (status === 429) {
      return new TranslationApiError(429, '翻譯次數過多，請稍後再試')
    }
    if (status === 503) {
      return new TranslationApiError(503, 'AI 翻譯目前尚未開放，請稍後再試')
    }
    if (status === 504) {
      return new TranslationApiError(504, '翻譯時間過長，請再試一次')
    }
    return new TranslationApiError(status, 'AI 翻譯暫時無法使用，請稍後再試')
  }

  if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
    return new TranslationApiError(0, '翻譯時間過長，請再試一次')
  }

  return new TranslationApiError(0, '無法連線到伺服器，請稍後再試')
}

export async function fetchWhiskyTranslation(
  request: WhiskyTranslationRequest,
): Promise<WhiskyTranslation> {
  try {
    const { data } = await apiClient.post<WhiskyTranslationResponse>(
      '/whisky-translations',
      request,
      { timeout: TRANSLATION_REQUEST_TIMEOUT_MS },
    )
    return data.translation
  } catch (error) {
    throw toTranslationApiError(error)
  }
}
