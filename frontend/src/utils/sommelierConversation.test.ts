import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Preference, StyleProfile, TasteProfile } from '../types/sommelier.ts'
import {
  CONVERSATION_STEPS,
  SOMMELIER_ARRIVAL_MS,
  SOMMELIER_ARRIVAL_TEXT,
  SOMMELIER_QUESTIONS,
  SKIPPED_FREE_TEXT_ANSWER,
  STEP_KINDS,
  THINKING_JITTER_MS,
  THINKING_MAX_MS,
  THINKING_MIN_MS,
  TYPING_MAX_MS,
  USER_TO_THINKING_MS,
  composeClosingMessage,
  describeBudgetAnswer,
  describeFreeTextAnswer,
  describeStyleAnswer,
  describeTastePicks,
  describeTasteRatings,
  formatBudget,
  getAcknowledgement,
  getSommelierGreeting,
  getThinkingCue,
  getThinkingDurationMs,
  getThinkingTexts,
  type ConversationStep,
  type ThinkingMoment,
} from './sommelierConversation.ts'

const STEPS: ConversationStep[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const MOMENTS: ThinkingMoment[] = ['opening', ...STEPS, 'retry', 'profile']

const TASTE: TasteProfile = { sweet: 8, fruit: 9, floral: 6, chocolateCoffee: 5, peat: 2, smoke: 1 }
const MID_TASTE: TasteProfile = { sweet: 5, fruit: 5, floral: 5, nutty: 5, oak: 5, spice: 5 }
const MID_STYLE: StyleProfile = { body: 5, intensity: 5, smoothness: 5 }

describe('sommelier greeting', () => {
  it('follows the time of day', () => {
    assert.equal(getSommelierGreeting(8), '早安，我是今天的侍酒師。先聊聊你想喝的感覺。')
    assert.equal(getSommelierGreeting(14), '午安，我是今天的侍酒師。先聊聊你想喝的感覺。')
    assert.equal(getSommelierGreeting(21), '嗨，我是今晚的侍酒師。先聊聊你想喝的感覺。')
    assert.equal(getSommelierGreeting(2), '這麼晚還沒睡呀，我是今晚的侍酒師。先聊聊你想喝的感覺。')
  })

  it('switches at 5, 11 and 17 o’clock', () => {
    assert.match(getSommelierGreeting(4), /^這麼晚/)
    assert.match(getSommelierGreeting(5), /^早安/)
    assert.match(getSommelierGreeting(11), /^午安/)
    assert.match(getSommelierGreeting(17), /^嗨/)
    assert.match(getSommelierGreeting(23), /^嗨/)
    assert.match(getSommelierGreeting(0), /^這麼晚/)
  })

  it('stays separate from the first question', () => {
    for (const hour of [2, 8, 14, 21]) {
      assert.equal(getSommelierGreeting(hour).includes(SOMMELIER_QUESTIONS[1].title), false)
    }
  })
})

describe('sommelier questions', () => {

  it('asks the nine questions in order', () => {
    assert.equal(CONVERSATION_STEPS, 9)
    assert.deepEqual(
      STEPS.map((step) => SOMMELIER_QUESTIONS[step].title),
      [
        '這次想喝到哪些風味？',
        '好，我們再聊聊這幾種風味，你各有多喜歡？',
        '還有這幾種風味，也來看看哪些比較吸引你。',
        '那這三種呢？各給個分數吧。',
        '你喜歡什麼樣的酒體？',
        '你偏好柔和一點，還是風味更鮮明的酒？',
        '你比較喜歡圓潤順口，還是帶點粗獷個性的口感？',
        '這次大概想把預算控制在哪裡？',
        '還有什麼想告訴我的嗎？',
      ],
    )
  })

  it('picks then rates each taste group, then asks style one at a time, budget and free text', () => {
    assert.deepEqual(
      STEPS.map((step) => STEP_KINDS[step]),
      [
        { type: 'pickTaste', group: 0 },
        { type: 'rateTaste', group: 0 },
        { type: 'pickTaste', group: 1 },
        { type: 'rateTaste', group: 1 },
        { type: 'style', key: 'body' },
        { type: 'style', key: 'intensity' },
        { type: 'style', key: 'smoothness' },
        { type: 'budget' },
        { type: 'freeText' },
      ],
    )
  })

  it('explains the rating scale and that intensity is not about ABV', () => {
    assert.equal(SOMMELIER_QUESTIONS[2].hint, '1 是幾乎不喜歡，10 是非常喜歡。')
    assert.equal(SOMMELIER_QUESTIONS[6].hint, '指的是整體風味的強弱，不是酒精濃度。')
    assert.equal(SOMMELIER_QUESTIONS[9].hint, '可以告訴我今晚的心情、場合，或任何你想補充的需求。')
  })
})

describe('thinking pacing', () => {
  it('lets the Sommelier arrive for about 3 s before the conversation opens', () => {
    assert.equal(SOMMELIER_ARRIVAL_MS, 3000)
    assert.deepEqual(SOMMELIER_ARRIVAL_TEXT, { en: 'Sommelier is coming…', zh: '侍酒師正在過來…' })
  })

  it('starts thinking about half a second after the user replies', () => {
    assert.ok(USER_TO_THINKING_MS >= 400 && USER_TO_THINKING_MS <= 600)
  })

  it('keeps every base thinking time between 0.9 and 1.7 s', () => {
    assert.equal(THINKING_MIN_MS, 900)
    assert.equal(THINKING_MAX_MS, 1700)
    for (const moment of MOMENTS) {
      const { durationMs } = getThinkingCue(moment)
      assert.ok(durationMs >= THINKING_MIN_MS && durationMs <= THINKING_MAX_MS, `${moment}: ${durationMs}`)
    }
  })

  it('adds typing time for longer replies, up to a cap', () => {
    const middle = () => 0.5
    const base = getThinkingCue(5).durationMs
    assert.equal(getThinkingDurationMs(5, '', middle), base)
    assert.equal(getThinkingDurationMs(5, '一二三四五', middle), base + 100)
    assert.equal(getThinkingDurationMs(5, '字'.repeat(100), middle), base + TYPING_MAX_MS)
  })

  it('spreads each pause by up to ±0.15 s', () => {
    const base = getThinkingCue(1).durationMs
    assert.equal(THINKING_JITTER_MS, 150)
    assert.equal(getThinkingDurationMs(1, '', () => 0), base - 150)
    assert.equal(getThinkingDurationMs(1, '', () => 0.999999), base + 150)
  })

  it('picks the thinking line at random from each moment’s pool', () => {
    assert.equal(getThinkingCue(9, () => 0).text, '嗯，我大概抓到你的方向了…')
    assert.equal(getThinkingCue(9, () => 0.999).text, '讓我把這些拼起來…')
    assert.equal(getThinkingCue('profile', () => 0).text, '我幫你整理一下……')
  })

  it('offers 2–3 lines for every answer, retry and profile', () => {
    for (const moment of MOMENTS.filter((item) => item !== 'opening')) {
      const texts = getThinkingTexts(moment)
      assert.ok(texts.length >= 2 && texts.length <= 3, `${moment}: ${texts.length}`)
      assert.equal(new Set(texts).size, texts.length, `${moment} has duplicates`)
    }
  })

  it('always says something while the Preference request or retry is running', () => {
    for (const moment of [9, 'retry', 'profile'] as const) {
      assert.ok(getThinkingTexts(moment).every((text) => text.length > 0), String(moment))
    }
  })
})

describe('getAcknowledgement', () => {
  const first = () => 0
  const values = (overrides: Partial<{ taste: TasteProfile; style: StyleProfile; budget: number }> = {}) => ({
    taste: MID_TASTE,
    style: MID_STYLE,
    budget: 2000,
    ...overrides,
  })

  it('reacts to a distinctive pair of picks', () => {
    assert.equal(getAcknowledgement(1, values({ taste: { citrus: 5, floral: 5, sweet: 5 } }), first), '柑橘加花香，很清新的組合。')
    assert.equal(getAcknowledgement(3, values({ taste: { peat: 5, smoke: 5, oak: 5 } }), first), '喔，喜歡有煙燻個性的。')
  })

  it('stays quiet for an ordinary set of picks', () => {
    assert.equal(getAcknowledgement(1, values({ taste: { sweet: 5, fruit: 5, citrus: 5 } }), first), null)
  })

  it('only reacts to picks in the group just answered', () => {
    assert.equal(getAcknowledgement(1, values({ taste: { sweet: 5, peat: 5, smoke: 5 } }), first), null)
  })

  it('reacts to a very high or very low rating', () => {
    assert.equal(getAcknowledgement(2, values({ taste: { sweet: 9, fruit: 5, floral: 5 } }), first), '看得出來你很愛甜感。')
    assert.equal(getAcknowledgement(2, values({ taste: { sweet: 5, fruit: 2, floral: 5 } }), first), '水果就少一點，記下了。')
    assert.equal(getAcknowledgement(4, values({ taste: { peat: 10, smoke: 5, oak: 5 } }), first), '泥煤給到這麼高，看來是重口味玩家。')
    assert.equal(getAcknowledgement(2, values({ taste: { sweet: 6, fruit: 7, floral: 5 } }), first), null)
  })

  it('reacts to a style rating only outside the middle band', () => {
    assert.equal(getAcknowledgement(5, values({ style: { ...MID_STYLE, body: 2 } }), first), '好，那我們走清爽一點的路線。')
    assert.equal(getAcknowledgement(6, values({ style: { ...MID_STYLE, intensity: 9 } }), first), '要夠勁的，沒問題。')
    assert.equal(getAcknowledgement(7, values(), first), null)
  })

  it('reacts to a very high or very low budget', () => {
    assert.equal(getAcknowledgement(8, values({ budget: 5000 }), first), '這個預算可以挑到很不錯的酒。')
    assert.equal(getAcknowledgement(8, values({ budget: 1500 }), first), '這個價位也有不少好喝的選擇。')
    assert.equal(getAcknowledgement(8, values({ budget: 3000 }), first), null)
  })

  it('never reacts to the free text', () => {
    assert.equal(getAcknowledgement(9, values(), first), null)
  })
})

describe('user answers', () => {
  it('lists the picked tastes', () => {
    assert.deepEqual(describeTastePicks(['sweet', 'fruit', 'floral']), ['甜感 · 水果 · 花香'])
  })

  it('lists only the given tastes with their ratings', () => {
    assert.deepEqual(describeTasteRatings(TASTE, ['sweet', 'fruit', 'floral']), ['甜感 8 · 水果 9 · 花香 6'])
    assert.deepEqual(describeTasteRatings(TASTE, ['chocolateCoffee', 'peat', 'smoke']), [
      '巧克力／咖啡 5 · 泥煤 2 · 煙燻 1',
    ])
  })

  it('answers one style question at a time, out of 10', () => {
    const style: StyleProfile = { body: 7, intensity: 6, smoothness: 9 }
    assert.deepEqual(describeStyleAnswer(style, 'body'), ['酒體 7 / 10'])
    assert.deepEqual(describeStyleAnswer(style, 'intensity'), ['風味強度 6 / 10'])
    assert.deepEqual(describeStyleAnswer(style, 'smoothness'), ['順口度 9 / 10'])
  })

  it('repeats the budget and the free text', () => {
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
  it('summarizes focus tastes, light tastes, non-neutral style and budget', () => {
    const preference: Preference = {
      taste: TASTE,
      style: { body: 8, intensity: 6, smoothness: 9 },
      budget: { max: 4000 },
    }
    assert.deepEqual(composeClosingMessage(preference), [
      '好，我大概知道今天的方向了。',
      '甜感、水果為主，泥煤、煙燻少一點，酒體厚重，口感圓潤順口，預算大約 NT$\u00a04,000 以內。',
      '我先把今天的方向整理成一份偏好輪廓給你。',
    ])
  })

  it('never treats unpicked tastes as light', () => {
    const preference: Preference = { taste: { sweet: 8, fruit: 9, floral: 7, nutty: 8, oak: 9, spice: 7 }, style: MID_STYLE }
    assert.equal(composeClosingMessage(preference)[1], '甜感、水果、花香、堅果、香料、橡木為主。')
  })

  it('stays short when every rating is in the middle', () => {
    const preference: Preference = { taste: MID_TASTE, style: MID_STYLE, budget: { max: 2000 } }
    assert.equal(composeClosingMessage(preference)[1], '預算大約 NT$\u00a02,000 以內。')
  })

  it('mentions occasion, companion and mood from the free text', () => {
    const preference: Preference = {
      taste: MID_TASTE,
      style: MID_STYLE,
      occasion: 'relaxing',
      companion: 'alone',
      mood: 'low',
    }
    assert.deepEqual(composeClosingMessage(preference), [
      '好，我大概知道今天的方向了。',
      '我也記下了：情境是放鬆、獨飲、一個人慢慢喝、有點累。',
      '我先把今天的方向整理成一份偏好輪廓給你。',
    ])
  })
})
