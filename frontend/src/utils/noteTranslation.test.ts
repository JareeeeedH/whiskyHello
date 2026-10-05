import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  NOTE_TRANSLATION_TEXT,
  createNoteTranslationController,
  createNoteTranslationState,
  isShowingTranslation,
} from './noteTranslation.ts'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('note translation state', () => {
  it('starts idle, showing the original note', () => {
    const state = createNoteTranslationState()

    assert.equal(state.status, 'idle')
    assert.equal(isShowingTranslation(state), false)
  })

  it('uses the agreed button and label wording', () => {
    assert.equal(NOTE_TRANSLATION_TEXT.translate, '中文翻譯')
    assert.equal(NOTE_TRANSLATION_TEXT.loading, '正在翻譯…')
    assert.equal(NOTE_TRANSLATION_TEXT.label, '中文翻譯 · AI')
    assert.equal(NOTE_TRANSLATION_TEXT.showOriginal, '顯示原文')
  })

  it('moves through loading to success and shows the translation', async () => {
    const state = createNoteTranslationState()
    const pending = deferred<string>()
    const controller = createNoteTranslationController(state, () => pending.promise)

    const done = controller.translate()
    assert.equal(state.status, 'loading')
    assert.equal(isShowingTranslation(state), false)

    pending.resolve('色澤：金黃。')
    await done

    assert.equal(state.status, 'success')
    assert.equal(state.translatedText, '色澤：金黃。')
    assert.equal(isShowingTranslation(state), true)
  })

  it('ignores repeated clicks while loading', async () => {
    const state = createNoteTranslationState()
    const pending = deferred<string>()
    let calls = 0
    const controller = createNoteTranslationController(state, () => {
      calls += 1
      return pending.promise
    })

    const first = controller.translate()
    await controller.translate()
    pending.resolve('翻譯')
    await first

    assert.equal(calls, 1)
  })

  it('toggles between the original and the translation without requesting again', async () => {
    const state = createNoteTranslationState()
    let calls = 0
    const controller = createNoteTranslationController(state, async () => {
      calls += 1
      return '翻譯'
    })

    await controller.translate()
    controller.showOriginal()
    assert.equal(state.status, 'success')
    assert.equal(isShowingTranslation(state), false)

    await controller.translate()
    assert.equal(isShowingTranslation(state), true)
    assert.equal(calls, 1)
  })

  it('shows the error message and recovers on retry', async () => {
    const state = createNoteTranslationState()
    let fail = true
    const controller = createNoteTranslationController(state, async () => {
      if (fail) throw new Error('翻譯時間過長，請再試一次')
      return '翻譯'
    })

    await controller.translate()
    assert.equal(state.status, 'error')
    assert.equal(state.error, '翻譯時間過長，請再試一次')
    assert.equal(isShowingTranslation(state), false)

    fail = false
    await controller.translate()
    assert.equal(state.status, 'success')
    assert.equal(state.error, '')
    assert.equal(state.translatedText, '翻譯')
  })

  it('falls back to a generic message for errors without one', async () => {
    const state = createNoteTranslationState()
    const controller = createNoteTranslationController(state, async () => {
      throw 'boom'
    })

    await controller.translate()
    assert.equal(state.error, NOTE_TRANSLATION_TEXT.fallbackError)
  })

  it('discards a response that arrives after a reset', async () => {
    const state = createNoteTranslationState()
    const pending = deferred<string>()
    const controller = createNoteTranslationController(state, () => pending.promise)

    const done = controller.translate()
    controller.reset()
    pending.resolve('上一支酒的翻譯')
    await done

    assert.deepEqual(state, createNoteTranslationState())
  })

  it('discards a failure that arrives after a reset', async () => {
    const state = createNoteTranslationState()
    const pending = deferred<string>()
    const controller = createNoteTranslationController(state, () => pending.promise)

    const done = controller.translate()
    controller.reset()
    pending.reject(new Error('failed'))
    await done

    assert.equal(state.status, 'idle')
    assert.equal(state.error, '')
  })
})
