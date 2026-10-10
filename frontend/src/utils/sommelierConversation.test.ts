import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { OccasionChoice, SommelierInput, StyleProfile, TasteProfile } from '../types/sommelier.ts'
import {
  CONVERSATION_STEPS,
  SKIPPED_FREE_TEXT_ANSWER,
  SKIPPED_TASTE_GROUP_ANSWER,
  SOMMELIER_ARRIVAL_MS,
  SOMMELIER_ARRIVAL_TEXT,
  THINKING_JITTER_MS,
  THINKING_MAX_MS,
  THINKING_MIN_MS,
  TYPING_MAX_MS,
  USER_TO_THINKING_MS,
  composeClosingMessage,
  composeSelectionSteps,
  composeUnableMessage,
  describeBudgetAnswer,
  describeFreeTextAnswer,
  describeOccasionAnswer,
  describeStyleAnswer,
  describeTastePicks,
  describeTasteRatings,
  formatBudget,
  getAcknowledgement,
  getQuestion,
  getSommelierGreeting,
  getThinkingCue,
  getThinkingDurationMs,
  getThinkingTexts,
  type StepKind,
  type ThinkingMoment,
} from './sommelierConversation.ts'

const MOMENTS: ThinkingMoment[] = [
  'opening',
  'pickTaste',
  'rateTaste',
  'style',
  'occasion',
  'budget',
  'freeText',
  'profile',
  'retry',
]

const TASTE: TasteProfile = { fruit: 9, floral: 6, maltGrain: 7, peat: 2 }
const MID_TASTE: TasteProfile = { fruit: 5, sweet: 5, nutty: 5, oak: 5 }
const MID_STYLE: StyleProfile = { body: 5, intensity: 5, smoothness: 5 }

const PICK_GROUP_1: StepKind = { type: 'pickTaste', group: 0 }
const PICK_GROUP_2: StepKind = { type: 'pickTaste', group: 1 }

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
    const first = getQuestion(PICK_GROUP_1).title
    for (const hour of [2, 8, 14, 21]) {
      assert.equal(getSommelierGreeting(hour).includes(first), false)
    }
  })
})

describe('conversation steps', () => {
  it('picks from both groups, rates all picks together, then style, budget and free text', () => {
    assert.deepEqual(CONVERSATION_STEPS, [
      { type: 'pickTaste', group: 0 },
      { type: 'pickTaste', group: 1 },
      { type: 'rateTaste' },
      { type: 'style', key: 'body' },
      { type: 'style', key: 'intensity' },
      { type: 'style', key: 'smoothness' },
      { type: 'occasion' },
      { type: 'budget' },
      { type: 'freeText' },
    ])
  })

  it('has no separate confirm step before rating', () => {
    assert.equal(CONVERSATION_STEPS.findIndex((kind) => kind.type === 'rateTaste'), 2)
  })
})

describe('sommelier questions', () => {
  it('asks which tastes to find in the whisky, suggesting 3–4', () => {
    assert.deepEqual(getQuestion(PICK_GROUP_1), {
      title: '這次，你最想在威士忌中喝到哪些風味？',
      hint: '選 3～4 種就好，挑出這次最想感受到的味道。',
    })
    assert.match(getQuestion(PICK_GROUP_2).hint ?? '', /3～5/)
  })

  it('asks how pronounced each picked taste should be; the sliders explain the scale', () => {
    assert.deepEqual(getQuestion({ type: 'rateTaste' }), {
      title: '你希望這些風味在這杯威士忌中各有多明顯？',
    })
  })

  it('never asks how much a taste is liked', () => {
    const texts = CONVERSATION_STEPS.flatMap((kind) => {
      const { title, hint } = getQuestion(kind)
      return [title, hint ?? '']
    })
    for (const liking of ['不喜歡', '多喜歡', '最愛']) {
      assert.equal(texts.some((text) => text.includes(liking)), false, liking)
    }
  })

  it('asks for one occasion', () => {
    assert.deepEqual(getQuestion({ type: 'occasion' }), {
      title: '這次是在什麼情境下喝呢？',
      hint: '選一個最接近的就好。',
    })
  })

  it('keeps the style, budget and free-text questions', () => {
    assert.equal(getQuestion({ type: 'style', key: 'body' }).title, '你喜歡什麼樣的酒體？')
    assert.equal(getQuestion({ type: 'style', key: 'intensity' }).hint, '指的是整體風味的強弱，不是酒精濃度。')
    assert.equal(getQuestion({ type: 'budget' }).title, '這次大概想把預算控制在哪裡？')
    assert.equal(
      getQuestion({ type: 'freeText' }).hint,
      '可以告訴我今晚的心情、場合，或任何你想補充的需求。',
    )
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
    const base = getThinkingCue('style').durationMs
    assert.equal(getThinkingDurationMs('style', '', middle), base)
    assert.equal(getThinkingDurationMs('style', '一二三四五', middle), base + 100)
    assert.equal(getThinkingDurationMs('style', '字'.repeat(100), middle), base + TYPING_MAX_MS)
  })

  it('spreads each pause by up to ±0.15 s', () => {
    const base = getThinkingCue('pickTaste').durationMs
    assert.equal(THINKING_JITTER_MS, 150)
    assert.equal(getThinkingDurationMs('pickTaste', '', () => 0), base - 150)
    assert.equal(getThinkingDurationMs('pickTaste', '', () => 0.999999), base + 150)
  })

  it('picks the thinking line at random from each moment’s pool', () => {
    assert.equal(getThinkingCue('freeText', () => 0).text, '嗯，我大概抓到你的方向了…')
    assert.equal(getThinkingCue('freeText', () => 0.999).text, '讓我把這些拼起來…')
    assert.equal(getThinkingCue('profile', () => 0).text, '我幫你整理一下……')
  })

  it('offers 2–3 lines for every answer, retry and profile', () => {
    for (const moment of MOMENTS.filter((item) => item !== 'opening')) {
      const texts = getThinkingTexts(moment)
      assert.ok(texts.length >= 2 && texts.length <= 3, `${moment}: ${texts.length}`)
      assert.equal(new Set(texts).size, texts.length, `${moment} has duplicates`)
    }
  })

  it('always says something while summarizing or retrying', () => {
    for (const moment of ['freeText', 'profile', 'retry'] as const) {
      assert.ok(getThinkingTexts(moment).every((text) => text.length > 0), moment)
    }
  })
})

describe('getAcknowledgement', () => {
  const first = () => 0
  const values = (
    overrides: Partial<{ taste: TasteProfile; style: StyleProfile; occasion: OccasionChoice | null; budget: number }> = {},
  ) => ({
    taste: MID_TASTE,
    style: MID_STYLE,
    occasion: null,
    budget: 2000,
    ...overrides,
  })

  it('reacts to a distinctive pair of picks', () => {
    assert.equal(getAcknowledgement(PICK_GROUP_1, values({ taste: { fruit: 5, floral: 5 } }), first), '果香加花香，很清新的組合。')
    assert.equal(getAcknowledgement(PICK_GROUP_2, values({ taste: { peat: 5, smoke: 5 } }), first), '喔，喜歡有煙燻個性的。')
  })

  it('stays quiet for an ordinary set of picks', () => {
    assert.equal(getAcknowledgement(PICK_GROUP_1, values({ taste: { fruit: 5, nutty: 5 } }), first), null)
  })

  it('only reacts to picks in the group just answered', () => {
    assert.equal(getAcknowledgement(PICK_GROUP_1, values({ taste: { sweet: 5, peat: 5, smoke: 5 } }), first), null)
  })

  it('reacts to a very pronounced taste first, else a very light one', () => {
    const rate: StepKind = { type: 'rateTaste' }
    assert.equal(getAcknowledgement(rate, values({ taste: { fruit: 2, floral: 9, oak: 5 } }), first), '花香要當主角，懂了。')
    assert.equal(getAcknowledgement(rate, values({ taste: { fruit: 6, floral: 2, oak: 5 } }), first), '花香淡淡帶到就好，記下了。')
    assert.equal(getAcknowledgement(rate, values({ taste: { fruit: 9, peat: 10, oak: 5 } }), first), '泥煤給到這麼高，看來是重口味玩家。')
    assert.equal(getAcknowledgement(rate, values({ taste: { fruit: 6, floral: 7, oak: 3 } }), first), null)
  })

  it('reacts to a style rating only outside the middle band', () => {
    const style = (key: 'body' | 'intensity' | 'smoothness'): StepKind => ({ type: 'style', key })
    assert.equal(getAcknowledgement(style('body'), values({ style: { ...MID_STYLE, body: 2 } }), first), '好，那我們走清爽一點的路線。')
    assert.equal(getAcknowledgement(style('intensity'), values({ style: { ...MID_STYLE, intensity: 9 } }), first), '要夠勁的，沒問題。')
    assert.equal(getAcknowledgement(style('smoothness'), values(), first), null)
  })

  it('reacts to a few special occasions only', () => {
    const occasion: StepKind = { type: 'occasion' }
    assert.equal(getAcknowledgement(occasion, values({ occasion: 'gift' }), first), '送禮的話，我會留意一下體面一點的。')
    assert.equal(getAcknowledgement(occasion, values({ occasion: 'celebration' }), first), '慶祝的話，就來點特別的吧。')
    assert.equal(getAcknowledgement(occasion, values({ occasion: 'relaxing' }), first), null)
    assert.equal(getAcknowledgement(occasion, values({ occasion: 'none' }), first), null)
  })

  it('reacts to a very high or very low budget', () => {
    const budget: StepKind = { type: 'budget' }
    assert.equal(getAcknowledgement(budget, values({ budget: 5000 }), first), '這個預算可以挑到很不錯的酒。')
    assert.equal(getAcknowledgement(budget, values({ budget: 1500 }), first), '這個價位也有不少好喝的選擇。')
    assert.equal(getAcknowledgement(budget, values({ budget: 3000 }), first), null)
  })

  it('never reacts to the free text', () => {
    assert.equal(getAcknowledgement({ type: 'freeText' }, values(), first), null)
  })
})

describe('user answers', () => {
  it('lists the picks of a group, or skips an empty group', () => {
    assert.deepEqual(describeTastePicks(['fruit', 'sweet', 'floral']), ['果香 · 甜香 · 花香'])
    assert.deepEqual(describeTastePicks([]), [SKIPPED_TASTE_GROUP_ANSWER])
  })

  it('lists every picked taste with its rating, and only those', () => {
    assert.deepEqual(describeTasteRatings(TASTE), ['果香 9 · 花香 6 · 麥芽／穀物 7 · 泥煤 2'])
  })

  it('answers one style question at a time, out of 10', () => {
    const style: StyleProfile = { body: 7, intensity: 6, smoothness: 9 }
    assert.deepEqual(describeStyleAnswer(style, 'body'), ['酒體 7 / 10'])
    assert.deepEqual(describeStyleAnswer(style, 'intensity'), ['風味強度 6 / 10'])
    assert.deepEqual(describeStyleAnswer(style, 'smoothness'), ['順口度 9 / 10'])
  })

  it('repeats the occasion with its icon', () => {
    assert.deepEqual(describeOccasionAnswer('date'), ['❤️ 伴侶約會'])
    assert.deepEqual(describeOccasionAnswer('none'), ['✨ 沒有特定情境'])
  })

  it('repeats the budget and the free text', () => {
    assert.deepEqual(describeBudgetAnswer(2000), ['預算 NT$\u00a02,000\u00a0左右'])
    assert.deepEqual(describeFreeTextAnswer('今晚約會'), ['今晚約會'])
    assert.deepEqual(describeFreeTextAnswer(undefined), [SKIPPED_FREE_TEXT_ANSWER])
  })
})

describe('formatBudget', () => {
  it('formats max-only, min-only and ranged budgets', () => {
    assert.equal(formatBudget({ max: 2000 }), 'NT$\u00a02,000\u00a0左右')
    assert.equal(formatBudget({ min: 3000 }), 'NT$\u00a03,000\u00a0以上')
    assert.equal(formatBudget({ min: 1000, max: 2500 }), 'NT$\u00a01,000 – 2,500')
  })
})

describe('composeClosingMessage', () => {
  it('summarizes the main tastes, light tastes, non-neutral style and budget', () => {
    const input: SommelierInput = {
      taste: TASTE,
      style: { body: 8, intensity: 6, smoothness: 9 },
      budget: { max: 4000 },
    }
    assert.deepEqual(composeClosingMessage(input), [
      '好，我大概知道今天的方向了。',
      '果香、麥芽／穀物為主，泥煤淡淡帶到，酒體厚重，口感圓潤順口，預算 NT$\u00a04,000\u00a0左右。',
      '我先把今天的方向整理成一份偏好輪廓給你。',
    ])
  })

  it('never treats unpicked tastes as light', () => {
    const input: SommelierInput = { taste: { fruit: 9, floral: 7, oak: 8 }, style: MID_STYLE }
    assert.equal(composeClosingMessage(input)[1], '果香、花香、木質／橡木為主。')
  })

  it('stays short when every rating is in the middle', () => {
    const input: SommelierInput = { taste: MID_TASTE, style: MID_STYLE, budget: { max: 2000 } }
    assert.equal(composeClosingMessage(input)[1], '預算 NT$\u00a02,000\u00a0左右。')
  })

  it('mentions the picked occasion', () => {
    const input: SommelierInput = { taste: MID_TASTE, style: MID_STYLE, occasion: 'relaxing' }
    assert.deepEqual(composeClosingMessage(input), [
      '好，我大概知道今天的方向了。',
      '我也記下了：情境是放鬆獨飲。',
      '我先把今天的方向整理成一份偏好輪廓給你。',
    ])
  })
})

describe('composeSelectionSteps', () => {
  const first = () => 0
  const last = () => 0.99

  it('walks through every answer, ending on the user’s own words', () => {
    const input: SommelierInput = {
      taste: TASTE,
      style: { body: 5, intensity: 5, smoothness: 8 },
      occasion: 'date',
      budget: { max: 2000 },
      freeText: '今晚約會，不要太重',
    }
    assert.deepEqual(composeSelectionSteps(input, first), [
      '先把泥煤壓低，泥土、海藻那類味道淡淡帶到就好…',
      '鎖定果香明亮、麥芽香濃的方向，要喝得到蘋果、麥片…',
      '再挑約會時好入口的…',
      '喝感要圓潤順口…',
      '再對照你說的「今晚約會，不要太重」…',
    ])
  })

  it('says the same choices in other words', () => {
    const input: SommelierInput = { taste: TASTE, style: MID_STYLE, occasion: 'date', freeText: '不要太重' }
    assert.deepEqual(composeSelectionSteps(input, last), [
      '先避開泥煤太重的，泥土、海藻只要輕輕帶過…',
      '主軸放在果香明亮、麥芽香濃，找蘋果、麥片這類風味突出的…',
      '約會喝的，要好入口、氣氛對的…',
      '把你提到的「不要太重」也放進來考慮…',
      '剩最後一步，確認兩支不要太像…',
    ])
  })

  it('reads a heavy, peaty profile, closing with a final check', () => {
    const input: SommelierInput = {
      taste: { peat: 10, smoke: 9, spice: 5 },
      style: { body: 8, intensity: 9, smoothness: 3 },
      occasion: 'tasting',
    }
    assert.deepEqual(composeSelectionSteps(input, first), [
      '鎖定泥煤夠份量、煙燻明顯的方向，要喝得到泥土、營火…',
      '再挑值得專心細品、層次夠多的…',
      '喝感要酒體厚實、風味鮮明…',
      '最後確認兩支風格不重複…',
    ])
  })

  it('always has at least 3 steps, focusing on the highest picks when none is high', () => {
    assert.deepEqual(composeSelectionSteps({ taste: { fruit: 4, sweet: 6, oak: 5 }, style: MID_STYLE }, first), [
      '鎖定甜香飽滿、橡木味足的方向，要喝得到蜂蜜、橡木…',
      '再看看哪些酒款最貼近你整體的感覺…',
      '最後確認兩支風格不重複…',
    ])
  })

  it('quotes long free text briefly and skips blank free text', () => {
    const long = composeSelectionSteps(
      { taste: TASTE, style: MID_STYLE, freeText: '之前喝過\n麥卡倫12年很喜歡，想找類似的雪莉桶' },
      first,
    )
    assert.ok(long.includes('再對照你說的「之前喝過 麥卡倫12年很喜歡…」…'))
    const blank = composeSelectionSteps({ taste: TASTE, style: MID_STYLE, freeText: '   ' }, first)
    assert.ok(blank.every((step) => !step.includes('「')))
  })

  it('never mentions the budget', () => {
    for (const random of [first, last]) {
      const steps = composeSelectionSteps({ taste: TASTE, style: MID_STYLE, budget: { max: 6000 } }, random)
      assert.ok(steps.every((step) => !step.includes('預算') && !step.includes('NT$')))
    }
  })
})

describe('composeUnableMessage', () => {
  it('puts the LLM reason between the apology and the suggestion', () => {
    assert.deepEqual(composeUnableMessage('這次的需求和威士忌無關。'), [
      '這次的條件比較特別，我暫時挑不到合適的兩支。',
      '這次的需求和威士忌無關。',
      '要不要調整一下需求，再讓我挑一次？',
    ])
  })

  it('still reads naturally without a reason', () => {
    assert.deepEqual(composeUnableMessage(undefined), [
      '這次的條件比較特別，我暫時挑不到合適的兩支。',
      '要不要調整一下需求，再讓我挑一次？',
    ])
  })
})
