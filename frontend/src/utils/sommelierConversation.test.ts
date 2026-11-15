import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  MESSAGE_MAX_LENGTH,
  SELECTION_STEPS,
  SOMMELIER_ARRIVAL_MS,
  SOMMELIER_ARRIVAL_TEXT,
  THINKING_JITTER_MS,
  TYPING_MAX_MS,
  describeMessage,
  getSommelierGreeting,
  getThinkingCue,
  getThinkingDurationMs,
  getThinkingTexts,
  type ThinkingMoment,
} from './sommelierConversation.ts'

describe('opening', () => {
  it('arrives for two seconds before the conversation opens', () => {
    assert.equal(SOMMELIER_ARRIVAL_MS, 2000)
    assert.deepEqual(SOMMELIER_ARRIVAL_TEXT, { en: 'Sommelier is coming…', zh: '侍酒師正在過來…' })
  })

  it('greets by the time of day, then asks what the user wants to drink', () => {
    const cases: [number, string][] = [
      [8, '早安，我是今天的侍酒師。'],
      [14, '午安，我是今天的侍酒師。'],
      [20, '嗨，我是今晚的侍酒師。'],
      [2, '這麼晚還沒睡呀，我是今晚的侍酒師。'],
    ]
    for (const [hour, first] of cases) {
      assert.deepEqual(getSommelierGreeting(hour), [first, '說說你這次想找什麼樣的威士忌？'], String(hour))
    }
  })

  it('accepts messages up to the backend limit', () => {
    assert.equal(MESSAGE_MAX_LENGTH, 500)
  })
})

describe('thinking', () => {
  const moments: ThinkingMoment[] = ['opening', 'retry']

  it('picks one of the lines for each moment', () => {
    for (const moment of moments) {
      const texts = getThinkingTexts(moment)
      assert.ok(texts.includes(getThinkingCue(moment, () => 0).text), moment)
      assert.ok(texts.includes(getThinkingCue(moment, () => 0.999).text), moment)
    }
  })

  it('adds typing time for the reply that follows, capped, plus jitter', () => {
    const base = getThinkingCue('retry').durationMs
    assert.equal(getThinkingDurationMs('retry', '', () => 0.5), base)
    assert.equal(getThinkingDurationMs('retry', '字'.repeat(1000), () => 0.5), base + TYPING_MAX_MS)
    assert.equal(getThinkingDurationMs('retry', '', () => 0), base - THINKING_JITTER_MS)
  })

  it('narrates the real steps: rewrite, search the critic notes, rerank, write the cards', () => {
    assert.equal(SELECTION_STEPS.length, 4)
    assert.ok(SELECTION_STEPS[0].includes('品飲筆記'))
    assert.ok(SELECTION_STEPS[1].includes('評論家筆記'))
    assert.ok(SELECTION_STEPS[2].includes('三支'))
    assert.ok(SELECTION_STEPS[3].includes('推薦理由'))
  })
})

describe('describeMessage', () => {
  it('shows each paragraph on its own line and drops blank lines', () => {
    assert.deepEqual(describeMessage('  喜歡雪莉桶 \n\n  不要太煙燻  '), ['喜歡雪莉桶', '不要太煙燻'])
  })
})
