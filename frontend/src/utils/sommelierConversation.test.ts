import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Preference } from '../types/sommelier.ts'
import {
  CONVERSATION_STEPS,
  SOMMELIER_ARRIVAL_MS,
  SOMMELIER_ARRIVAL_TEXT,
  SOMMELIER_QUESTIONS,
  SKIPPED_FREE_TEXT_ANSWER,
  THINKING_MAX_MS,
  THINKING_MIN_MS,
  USER_TO_THINKING_MS,
  composeClosingMessage,
  describeBudgetAnswer,
  describeFreeTextAnswer,
  describeIntensityAnswer,
  describeTasteAnswer,
  formatBudget,
  getThinkingCue,
  respondToBudget,
  respondToIntensity,
  respondToTaste,
  type ConversationStep,
  type ThinkingMoment,
} from './sommelierConversation.ts'

const STEPS: ConversationStep[] = [1, 2, 3, 4]
const MOMENTS: ThinkingMoment[] = ['opening', ...STEPS, 'retry', 'profile']

describe('sommelier questions', () => {
  it('asks the four spec questions in order', () => {
    assert.equal(CONVERSATION_STEPS, 4)
    assert.deepEqual(
      STEPS.map((step) => SOMMELIER_QUESTIONS[step].title),
      ['這次想喝到哪些風味？', '泥煤與煙燻，你希望到什麼程度？', '這次大概想把預算控制在哪裡？', '還有什麼想告訴我的嗎？'],
    )
    assert.equal(SOMMELIER_QUESTIONS[4].hint, '可以告訴我今晚的心情、場合，或任何你想補充的需求。')
    assert.equal(SOMMELIER_QUESTIONS[1].hint, undefined)
  })
})

describe('thinking pacing', () => {
  it('lets the Sommelier arrive for about 3 s before the conversation opens', () => {
    assert.equal(SOMMELIER_ARRIVAL_MS, 3000)
    assert.deepEqual(SOMMELIER_ARRIVAL_TEXT, { en: 'Sommelier is coming…', zh: '侍酒師正在過來…' })
  })

  it('starts thinking 0.2–0.4 s after the user replies', () => {
    assert.ok(USER_TO_THINKING_MS >= 200 && USER_TO_THINKING_MS <= 400)
  })

  it('keeps every thinking state between 0.8 and 1.5 s', () => {
    assert.equal(THINKING_MIN_MS, 800)
    assert.equal(THINKING_MAX_MS, 1500)
    for (const moment of MOMENTS) {
      const { durationMs } = getThinkingCue(moment)
      assert.ok(durationMs >= THINKING_MIN_MS && durationMs <= THINKING_MAX_MS, `${moment}: ${durationMs}`)
    }
  })

  it('uses the spec wording before the closing message and the profile', () => {
    assert.equal(getThinkingCue(4).text, '嗯，我大概抓到你的方向了…')
    assert.equal(getThinkingCue('profile').text, '我幫你整理一下……')
  })
})

describe('sommelier responses', () => {
  it('acknowledges flavors with a pattern that depends on how many were picked', () => {
    assert.deepEqual(respondToTaste(['vanilla']), ['好，這次就以香草為主軸。'])
    assert.deepEqual(respondToTaste(['sweet', 'fruity']), ['不錯，這次我們先往甜潤、果香的方向找。'])
    assert.deepEqual(respondToTaste(['sweet', 'fruity', 'vanilla']), ['了解，這次的風味重心會放在甜潤、果香與香草。'])
  })

  it('reflects each peat and smoke combination, treating 0 as not wanted', () => {
    assert.equal(respondToIntensity(0, 0)[0], '了解，這次先避開泥煤與煙燻。')
    assert.equal(respondToIntensity(0, 30)[0], '了解，這次不要泥煤，煙燻感控制得比較輕。')
    assert.equal(respondToIntensity(80, 0)[0], '了解，這次不要煙燻，泥煤感可以明顯一些。')
    assert.equal(respondToIntensity(50, 60)[0], '好，泥煤與煙燻都保持在適中的程度。')
    assert.equal(respondToIntensity(90, 10)[0], '好，泥煤可以明顯一些，煙燻控制得比較輕。')
  })

  it('repeats the budget back as a max with thousands separators', () => {
    assert.deepEqual(respondToBudget(2000), ['收到，我會把預算控制在 NT$\u00a02,000 以內。'])
  })
})

describe('user answers', () => {
  it('formats each answer as a short YOU message', () => {
    assert.deepEqual(describeTasteAnswer(['sweet', 'fruity']), ['甜感 · 果香'])
    assert.deepEqual(describeIntensityAnswer(0, 30), ['泥煤 0 · 煙燻 30'])
    assert.deepEqual(describeBudgetAnswer(2000), ['預算 NT$\u00a02,000'])
    assert.deepEqual(describeFreeTextAnswer('今晚約會'), ['今晚約會'])
    assert.deepEqual(describeFreeTextAnswer(undefined), [SKIPPED_FREE_TEXT_ANSWER])
  })
})

describe('formatBudget', () => {
  it('formats max-only, min-only and ranged budgets', () => {
    assert.equal(formatBudget({ max: 2000 }), 'NT$\u00a02,000 以內')
    assert.equal(formatBudget({ min: 3000 }), 'NT$\u00a03,000 以上')
    assert.equal(formatBudget({ min: 1000, max: 2500 }), 'NT$\u00a01,000 – 2,500')
  })
})

describe('composeClosingMessage', () => {
  it('summarizes taste, slider intensity and budget', () => {
    const preference: Preference = {
      taste: [
        { tag: 'sweet', level: 'medium' },
        { tag: 'fruity', level: 'medium' },
      ],
      dislikes: [],
      intensity: { peaty: 0, smoky: 20 },
      budget: { max: 2000 },
    }
    assert.deepEqual(composeClosingMessage(preference), [
      '好，我大概知道今天的方向了。',
      '甜潤、果香為主，不要泥煤，煙燻可以有一點，預算大約 NT$\u00a02,000 以內。',
      '我先把今天的方向整理成一份偏好輪廓給你。',
    ])
  })

  it('separates leading flavors from subtle ones', () => {
    const preference: Preference = {
      taste: [
        { tag: 'sweet', level: 'low' },
        { tag: 'fruity', level: 'high' },
      ],
      dislikes: [],
    }
    assert.equal(composeClosingMessage(preference)[1], '果香為主，帶一點甜潤。')
  })

  it('lets free-text smoke override the smoke slider', () => {
    const preference: Preference = {
      taste: [{ tag: 'sweet', level: 'medium' }],
      dislikes: ['smoky'],
      intensity: { peaty: 20, smoky: 53 },
      budget: { max: 2000 },
      mood: 'low',
    }
    const [, summary, context] = composeClosingMessage(preference)
    assert.equal(summary, '甜潤為主，避開煙燻感，泥煤可以有一點，預算大約 NT$\u00a02,000 以內。')
    assert.ok(!summary?.includes('煙燻保留'))
    assert.equal(context, '我也記下了：有點累。')
  })

  it('mentions occasion and companion from the free text', () => {
    const preference: Preference = {
      taste: [{ tag: 'floral', level: 'low' }],
      dislikes: [],
      intensity: { peaty: 0, smoky: 0 },
      occasion: 'date',
      companion: 'partner',
    }
    assert.deepEqual(composeClosingMessage(preference).slice(1, 3), [
      '帶一點花香，不要泥煤與煙燻。',
      '我也記下了：情境是約會、和伴侶一起。',
    ])
  })
})
