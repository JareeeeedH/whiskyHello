import type {
  Preference,
  SommelierBudget,
  SommelierCompanion,
  SommelierInputDraft,
  SommelierMood,
  StyleKey,
  StyleProfile,
  TasteKey,
  TasteProfile,
} from '../types/sommelier.ts'
import {
  RATING_MAX,
  STYLE_KEYS,
  STYLE_LABELS,
  TASTE_GROUPS,
  TASTE_KEYS,
  TASTE_LABELS,
  pickedTastes,
} from './sommelierInput.ts'
import { PREFERENCE_OCCASION_LABELS } from './sommelierPreference.ts'

/**
 * Scripted Sommelier lines and pacing for the conversation.
 * Everything here is deterministic UX copy; only the closing message reads
 * the real Preference, and nothing here calls the LLM.
 */

export type ConversationStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export const CONVERSATION_STEPS = 9

/** What each question asks for; `group` indexes TASTE_GROUPS. */
export type StepKind =
  | { type: 'pickTaste'; group: number }
  | { type: 'rateTaste'; group: number }
  | { type: 'style'; key: StyleKey }
  | { type: 'budget' }
  | { type: 'freeText' }

export const STEP_KINDS: Record<ConversationStep, StepKind> = {
  1: { type: 'pickTaste', group: 0 },
  2: { type: 'rateTaste', group: 0 },
  3: { type: 'pickTaste', group: 1 },
  4: { type: 'rateTaste', group: 1 },
  5: { type: 'style', key: 'body' },
  6: { type: 'style', key: 'intensity' },
  7: { type: 'style', key: 'smoothness' },
  8: { type: 'budget' },
  9: { type: 'freeText' },
}

/** How long the "Sommelier is on the way" state stays before the conversation opens. */
export const SOMMELIER_ARRIVAL_MS = 3000
export const SOMMELIER_ARRIVAL_TEXT = { en: 'Sommelier is coming…', zh: '侍酒師正在過來…' } as const

/** The opening line follows the visitor's local time of day. */
export function getSommelierGreeting(hour: number): string {
  if (hour >= 5 && hour < 11) {
    return '早安，我是今天的侍酒師。先聊聊你想喝的感覺。'
  }
  if (hour >= 11 && hour < 17) {
    return '午安，我是今天的侍酒師。先聊聊你想喝的感覺。'
  }
  if (hour >= 17) {
    return '嗨，我是今晚的侍酒師。先聊聊你想喝的感覺。'
  }
  return '這麼晚還沒睡呀，我是今晚的侍酒師。先聊聊你想喝的感覺。'
}

export const SOMMELIER_QUESTIONS: Record<ConversationStep, { title: string; hint?: string }> = {
  1: { title: '這次想喝到哪些風味？', hint: '挑 3 種最吸引你的。' },
  2: { title: '好，我們再聊聊這幾種風味，你各有多喜歡？', hint: '1 是幾乎不喜歡，10 是非常喜歡。' },
  3: { title: '還有這幾種風味，也來看看哪些比較吸引你。', hint: '一樣挑 3 種。' },
  4: { title: '那這三種呢？各給個分數吧。' },
  5: { title: '你喜歡什麼樣的酒體？' },
  6: { title: '你偏好柔和一點，還是風味更鮮明的酒？', hint: '指的是整體風味的強弱，不是酒精濃度。' },
  7: { title: '你比較喜歡圓潤順口，還是帶點粗獷個性的口感？' },
  8: { title: '這次大概想把預算控制在哪裡？' },
  9: {
    title: '還有什麼想告訴我的嗎？',
    hint: '可以告訴我今晚的心情、場合，或任何你想補充的需求。',
  },
}

/** Pause between the user's message landing and the thinking state appearing. */
export const USER_TO_THINKING_MS = 500
/** Pause between consecutive Sommelier messages, e.g. the greeting and the first question. */
export const BETWEEN_MESSAGES_MS = 750
/** Pause before the reply input slides in under a new question. */
export const QUESTION_TO_INPUT_MS = 400
/** After this long, a still-pending Preference request swaps to a reassuring thinking line. */
export const LONG_WAIT_MS = 4000

/** Range of the base thinking time, before typing time and jitter are added. */
export const THINKING_MIN_MS = 900
export const THINKING_MAX_MS = 1700
/** Longer replies keep the Sommelier "typing" a little longer, up to a cap. */
export const TYPING_MS_PER_CHAR = 20
export const TYPING_MAX_MS = 500
/** Random spread, so no two pauses feel exactly alike. */
export const THINKING_JITTER_MS = 150

export interface ThinkingCue {
  /** Empty text renders the animated dots on their own. */
  text: string
  /** Minimum time the thinking state stays visible. */
  durationMs: number
}

export type ThinkingMoment = 'opening' | ConversationStep | 'retry' | 'profile'

/**
 * Keyed by the step just answered; the last one covers the Preference request.
 * One line is picked at random each time; '' shows the dots on their own.
 */
const THINKING_CUES: Record<ThinkingMoment, { texts: string[]; durationMs: number }> = {
  opening: { texts: [''], durationMs: 1000 },
  1: { texts: ['', '嗯，這幾個不錯…', '我看看…'], durationMs: 900 },
  2: { texts: ['嗯，讓我看看…', '我記一下…', '好，我想想…'], durationMs: 1200 },
  3: { texts: ['', '嗯…', '我看看…'], durationMs: 900 },
  4: { texts: ['好，記下了…', '嗯，有點輪廓了…', '我整理一下…'], durationMs: 1200 },
  5: { texts: ['', '嗯…', '好…'], durationMs: 900 },
  6: { texts: ['', '嗯…', '了解…'], durationMs: 900 },
  7: { texts: ['', '好…', '我記一下…'], durationMs: 1000 },
  8: { texts: ['', '了解…', '我記一下…'], durationMs: 900 },
  9: {
    texts: ['嗯，我大概抓到你的方向了…', '好，我差不多有個方向了…', '讓我把這些拼起來…'],
    durationMs: 1700,
  },
  retry: { texts: ['再試一次，稍等我一下…', '我再整理一次…'], durationMs: 1400 },
  profile: { texts: ['我幫你整理一下……', '稍等，我把它寫下來…'], durationMs: 1400 },
}

export const LONG_WAIT_TEXT = '還在整理，馬上就好…'

export function getThinkingTexts(moment: ThinkingMoment): readonly string[] {
  return THINKING_CUES[moment].texts
}

export function getThinkingCue(moment: ThinkingMoment, random: () => number = Math.random): ThinkingCue {
  const { texts, durationMs } = THINKING_CUES[moment]
  return { text: texts[Math.floor(random() * texts.length)] ?? '', durationMs }
}

/** Base cue time, plus typing time for the reply that follows, plus a little jitter. */
export function getThinkingDurationMs(
  moment: ThinkingMoment,
  upcomingText = '',
  random: () => number = Math.random,
): number {
  const typing = Math.min(upcomingText.length * TYPING_MS_PER_CHAR, TYPING_MAX_MS)
  const jitter = Math.round((random() * 2 - 1) * THINKING_JITTER_MS)
  return THINKING_CUES[moment].durationMs + typing + jitter
}

/** Ratings at or above this read as "a focus"; at or below LOW_RATING as "keep it light". */
const HIGH_RATING = 7
const LOW_RATING = 3

type RatingBand = 'low' | 'mid' | 'high'

function ratingBand(value: number): RatingBand {
  if (value >= HIGH_RATING) return 'high'
  if (value <= LOW_RATING) return 'low'
  return 'mid'
}

export function formatAmount(value: number): string {
  return value.toLocaleString('zh-TW')
}

/** "NT$ 2,000" with a non-breaking space, so the currency never wraps away from the amount. */
export function formatPrice(value: number): string {
  return `NT$\u00a0${formatAmount(value)}`
}

export function formatBudget(budget: SommelierBudget): string {
  if (budget.min !== undefined && budget.max !== undefined) {
    return `${formatPrice(budget.min)} – ${formatAmount(budget.max)}`
  }
  if (budget.min !== undefined) {
    return `${formatPrice(budget.min)} 以上`
  }
  return `${formatPrice(budget.max ?? 0)} 以內`
}

const STYLE_PHRASES: Record<StyleKey, Record<RatingBand, string>> = {
  body: { low: '酒體輕盈', mid: '酒體適中', high: '酒體厚重' },
  intensity: { low: '風味柔和', mid: '風味強度適中', high: '風味強烈' },
  smoothness: { low: '口感粗獷有勁', mid: '順口度適中', high: '口感圓潤順口' },
}

const MOOD_CONTEXT: Partial<Record<SommelierMood, string>> = {
  positive: '心情不錯',
  low: '有點累',
  stressed: '壓力有點大',
}

const COMPANION_CONTEXT: Record<SommelierCompanion, string> = {
  alone: '一個人慢慢喝',
  friend: '和朋友一起',
  date: '和約會對象一起',
  partner: '和伴侶一起',
  family: '和家人一起',
}

/** Rated tastes in a band; unrated tastes are unknown and never counted. */
function tastesInBand(taste: TasteProfile, band: RatingBand): string[] {
  return TASTE_KEYS.filter((key) => {
    const value = taste[key]
    return value !== undefined && ratingBand(value) === band
  }).map((key) => TASTE_LABELS[key])
}

/** The Sommelier's wrap-up, built from the returned Preference. */
export function composeClosingMessage(preference: Preference): string[] {
  const parts: string[] = []

  const high = tastesInBand(preference.taste, 'high')
  const low = tastesInBand(preference.taste, 'low')
  if (high.length > 0) {
    parts.push(`${high.join('、')}為主`)
  }
  if (low.length > 0) {
    parts.push(`${low.join('、')}少一點`)
  }
  parts.push(
    ...STYLE_KEYS.map((key) => ({ key, band: ratingBand(preference.style[key]) }))
      .filter((item) => item.band !== 'mid')
      .map((item) => STYLE_PHRASES[item.key][item.band]),
  )
  if (preference.budget) {
    parts.push(`預算大約 ${formatBudget(preference.budget)}`)
  }

  const context: string[] = []
  if (preference.occasion) {
    context.push(`情境是${PREFERENCE_OCCASION_LABELS[preference.occasion]}`)
  }
  if (preference.companion) {
    context.push(COMPANION_CONTEXT[preference.companion])
  }
  const mood = preference.mood ? MOOD_CONTEXT[preference.mood] : undefined
  if (mood) {
    context.push(mood)
  }

  return [
    '好，我大概知道今天的方向了。',
    ...(parts.length > 0 ? [`${parts.join('，')}。`] : []),
    ...(context.length > 0 ? [`我也記下了：${context.join('、')}。`] : []),
    '我先把今天的方向整理成一份偏好輪廓給你。',
  ]
}

export function describeTastePicks(keys: readonly TasteKey[]): string[] {
  return [keys.map((key) => TASTE_LABELS[key]).join(' · ')]
}

export function describeTasteRatings(taste: TasteProfile, keys: readonly TasteKey[]): string[] {
  return [keys.map((key) => `${TASTE_LABELS[key]} ${taste[key]}`).join(' · ')]
}

export function describeStyleAnswer(style: StyleProfile, key: StyleKey): string[] {
  return [`${STYLE_LABELS[key]} ${style[key]} / ${RATING_MAX}`]
}

export function describeBudgetAnswer(max: number): string[] {
  return [`預算 ${formatPrice(max)}`]
}

/** At most this many short reactions per conversation, so they never feel scripted. */
export const MAX_ACKNOWLEDGEMENTS = 3

type AcknowledgementValues = Pick<SommelierInputDraft, 'taste' | 'style' | 'budget'>

const PICK_PAIRS: Record<number, { keys: [TasteKey, TasteKey]; lines: string[] }[]> = {
  0: [
    { keys: ['citrus', 'floral'], lines: ['柑橘加花香，很清新的組合。', '柑橘跟花香，聽起來很明亮。'] },
    { keys: ['sweet', 'vanillaCaramel'], lines: ['甜感配香草焦糖，走甜美路線。', '偏甜的香草焦糖調，懂了。'] },
    { keys: ['fruit', 'driedFruit'], lines: ['新鮮水果加果乾，果香控呢。'] },
  ],
  1: [
    { keys: ['peat', 'smoke'], lines: ['喔，喜歡有煙燻個性的。', '泥煤加煙燻，有點重口味喔。'] },
    { keys: ['nutty', 'chocolateCoffee'], lines: ['堅果配巧克力，很溫暖的味道。'] },
    { keys: ['spice', 'oak'], lines: ['香料跟橡木，偏成熟穩重。'] },
  ],
}

const STYLE_REACTIONS: Record<StyleKey, { low: string[]; high: string[] }> = {
  body: { low: ['好，那我們走清爽一點的路線。'], high: ['喜歡飽滿厚實的，了解。'] },
  intensity: { low: ['柔和一點，喝起來比較放鬆。'], high: ['要夠勁的，沒問題。'] },
  smoothness: { low: ['喜歡有點個性的口感，不錯。'], high: ['順口很重要，我懂。'] },
}

function pickLine(lines: string[], random: () => number): string | null {
  return lines[Math.floor(random() * lines.length)] ?? null
}

function reactToRatings(taste: TasteProfile, keys: TasteKey[], random: () => number): string | null {
  if ((taste.peat ?? 0) >= 9) {
    return '泥煤給到這麼高，看來是重口味玩家。'
  }
  const top = keys.find((key) => (taste[key] ?? 0) >= 9)
  if (top) {
    return pickLine([`看得出來你很愛${TASTE_LABELS[top]}。`, `${TASTE_LABELS[top]}給到這麼高，記住了。`], random)
  }
  const bottom = keys.find((key) => (taste[key] ?? RATING_MAX) <= 2)
  return bottom ? `${TASTE_LABELS[bottom]}就少一點，記下了。` : null
}

/**
 * A short reaction to a distinctive answer, or null for an ordinary one.
 * Scripted on purpose: no LLM call, so it's instant and predictable.
 */
export function getAcknowledgement(
  step: ConversationStep,
  values: AcknowledgementValues,
  random: () => number = Math.random,
): string | null {
  const kind = STEP_KINDS[step]
  switch (kind.type) {
    case 'pickTaste': {
      const picks = pickedTastes(values.taste, TASTE_GROUPS[kind.group] ?? [])
      const pair = PICK_PAIRS[kind.group]?.find(({ keys }) => keys.every((key) => picks.includes(key)))
      return pair ? pickLine(pair.lines, random) : null
    }
    case 'rateTaste':
      return reactToRatings(values.taste, pickedTastes(values.taste, TASTE_GROUPS[kind.group] ?? []), random)
    case 'style': {
      const band = ratingBand(values.style[kind.key])
      return band === 'mid' ? null : pickLine(STYLE_REACTIONS[kind.key][band], random)
    }
    case 'budget':
      if (values.budget >= 5000) return '這個預算可以挑到很不錯的酒。'
      if (values.budget <= 1500) return '這個價位也有不少好喝的選擇。'
      return null
    default:
      return null
  }
}

export const SKIPPED_FREE_TEXT_ANSWER = '先這樣就好'

export function describeFreeTextAnswer(freeText: string | undefined): string[] {
  return [freeText || SKIPPED_FREE_TEXT_ANSWER]
}
