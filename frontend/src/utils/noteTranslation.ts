/**
 * Display state for translating a critic note on the Whisky Detail page.
 * Framework-free so it can be tested with node:test; the view wraps the
 * state in `reactive()`.
 */

export type NoteTranslationStatus = 'idle' | 'loading' | 'success' | 'error'

export interface NoteTranslationState {
  status: NoteTranslationStatus
  translatedText: string
  /** After a successful translation, whether the reader switched back to the English original. */
  showingOriginal: boolean
  error: string
}

export const NOTE_TRANSLATION_TEXT = {
  translate: '中文翻譯',
  loading: '正在翻譯…',
  label: '中文翻譯 · AI',
  showOriginal: '顯示原文',
  retry: '重試',
  fallbackError: 'AI 翻譯暫時無法使用，請稍後再試',
} as const

export function createNoteTranslationState(): NoteTranslationState {
  return { status: 'idle', translatedText: '', showingOriginal: false, error: '' }
}

/** True when the Chinese translation (not the original note) should be displayed. */
export function isShowingTranslation(state: NoteTranslationState): boolean {
  return state.status === 'success' && !state.showingOriginal
}

export interface NoteTranslationController {
  /** Translates on first use; afterwards switches back to the stored translation without a request. */
  translate(): Promise<void>
  showOriginal(): void
  /** Clears the state and ignores any response still in flight (e.g. after navigating to another whisky). */
  reset(): void
}

export function createNoteTranslationController(
  state: NoteTranslationState,
  requestTranslation: () => Promise<string>,
): NoteTranslationController {
  let requestId = 0

  async function translate(): Promise<void> {
    if (state.status === 'loading') {
      return
    }
    if (state.status === 'success') {
      state.showingOriginal = false
      return
    }

    const current = ++requestId
    state.status = 'loading'
    state.error = ''

    try {
      const translatedText = await requestTranslation()
      if (current !== requestId) {
        return
      }
      state.translatedText = translatedText
      state.showingOriginal = false
      state.status = 'success'
    } catch (error) {
      if (current !== requestId) {
        return
      }
      state.error =
        error instanceof Error && error.message ? error.message : NOTE_TRANSLATION_TEXT.fallbackError
      state.status = 'error'
    }
  }

  function showOriginal(): void {
    if (state.status === 'success') {
      state.showingOriginal = true
    }
  }

  function reset(): void {
    requestId += 1
    Object.assign(state, createNoteTranslationState())
  }

  return { translate, showOriginal, reset }
}
