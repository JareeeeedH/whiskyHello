import type {
  FlavorTag,
  Preference,
  SommelierBudget,
  SommelierCompanion,
  SommelierMood,
} from '../types/sommelier.ts'
import { FLAVOR_TAG_LABELS, INTENSITY_MIN } from './sommelierInput.ts'
import { PREFERENCE_OCCASION_LABELS } from './sommelierPreference.ts'

/**
 * Scripted Sommelier lines and pacing for the conversational Step 1 (§2.6).
 * Everything here is deterministic UX copy; only the closing message reads
 * the real Step 2 Preference, and nothing here calls the LLM.
 */

export type ConversationStep = 1 | 2 | 3 | 4

export const CONVERSATION_STEPS = 4

/** How long the "Sommelier is on the way" state stays before the conversation opens. */
export const SOMMELIER_ARRIVAL_MS = 3000
export const SOMMELIER_ARRIVAL_TEXT = { en: 'Sommelier is coming…', zh: '侍酒師正在過來…' } as const

export const SOMMELIER_GREETING = '嗨，我是今晚的 Sommelier。先聊聊你想喝的感覺。'

export const SOMMELIER_QUESTIONS: Record<ConversationStep, { title: string; hint?: string }> = {
  1: { title: '這次想喝到哪些風味？' },
  2: { title: '泥煤與煙燻，你希望到什麼程度？' },
  3: { title: '這次大概想把預算控制在哪裡？' },
  4: {
    title: '還有什麼想告訴我的嗎？',
    hint: '可以告訴我今晚的心情、場合，或任何你想補充的需求。',
  },
}

/** Pause between the user's message landing and the thinking state appearing. */
export const USER_TO_THINKING_MS = 300
/** Pause between consecutive Sommelier messages, e.g. a response and the next question. */
export const BETWEEN_MESSAGES_MS = 550
/** Pause before the reply input slides in under a new question. */
export const QUESTION_TO_INPUT_MS = 250
/** After this long, a still-pending Step 2 request swaps to a reassuring thinking line. */
export const LONG_WAIT_MS = 4000

export const THINKING_MIN_MS = 800
export const THINKING_MAX_MS = 1500

export interface ThinkingCue {
  /** Empty text renders the animated dots on their own. */
  text: string
  /** Minimum time the thinking state stays visible. */
  durationMs: number
}

export type ThinkingMoment = 'opening' | ConversationStep | 'retry' | 'profile'

const THINKING_CUES: Record<ThinkingMoment, ThinkingCue> = {
  opening: { text: '', durationMs: 800 },
  1: { text: '正在想一下…', durationMs: 1000 },
  2: { text: '嗯，讓我看看…', durationMs: 1100 },
  3: { text: '', durationMs: 900 },
  4: { text: '嗯，我大概抓到你的方向了…', durationMs: 1300 },
  retry: { text: '再試一次，稍等我一下…', durationMs: 1000 },
  profile: { text: '我幫你整理一下……', durationMs: 1000 },
}

export const LONG_WAIT_TEXT = '還在整理，馬上就好…'

export function getThinkingCue(moment: ThinkingMoment): ThinkingCue {
  return THINKING_CUES[moment]
}

const FLAVOR_DIRECTIONS: Record<FlavorTag, string> = {
  sweet: '甜潤',
  fruity: '果香',
  floral: '花香',
  vanilla: '香草',
  woody: '橡木桶',
  spicy: '辛香',
  smoky: '煙燻',
  peaty: '泥煤',
  maritime: '海潮',
}

function joinWithAnd(items: readonly string[]): string {
  if (items.length <= 1) {
    return items[0] ?? ''
  }
  return `${items.slice(0, -1).join('、')}與${items[items.length - 1]}`
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

export function respondToTaste(taste: readonly FlavorTag[]): string[] {
  const directions = taste.map((tag) => FLAVOR_DIRECTIONS[tag])
  if (directions.length === 1) {
    return [`好，這次就以${directions[0]}為主軸。`]
  }
  if (directions.length === 2) {
    return [`不錯，這次我們先往${directions[0]}、${directions[1]}的方向找。`]
  }
  return [`了解，這次的風味重心會放在${joinWithAnd(directions)}。`]
}

type IntensityBand = 'none' | 'light' | 'medium' | 'bold'

function intensityBand(value: number): IntensityBand {
  if (value <= INTENSITY_MIN) return 'none'
  if (value <= 33) return 'light'
  if (value <= 66) return 'medium'
  return 'bold'
}

const BAND_PHRASES: Record<IntensityBand, string> = {
  none: '',
  light: '控制得比較輕',
  medium: '保持在適中的程度',
  bold: '可以明顯一些',
}

export function respondToIntensity(peaty: number, smoky: number): string[] {
  const peat = intensityBand(peaty)
  const smoke = intensityBand(smoky)
  if (peat === 'none' && smoke === 'none') {
    return ['了解，這次先避開泥煤與煙燻。']
  }
  if (peat === 'none') {
    return [`了解，這次不要泥煤，煙燻感${BAND_PHRASES[smoke]}。`]
  }
  if (smoke === 'none') {
    return [`了解，這次不要煙燻，泥煤感${BAND_PHRASES[peat]}。`]
  }
  if (peat === smoke) {
    return [`好，泥煤與煙燻都${BAND_PHRASES[peat]}。`]
  }
  return [`好，泥煤${BAND_PHRASES[peat]}，煙燻${BAND_PHRASES[smoke]}。`]
}

export function respondToBudget(max: number): string[] {
  return [`收到，我會把預算控制在 ${formatPrice(max)} 以內。`]
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

const SMOKE_AND_PEAT: readonly FlavorTag[] = ['peaty', 'smoky']

const INTENSITY_SUBJECTS: Record<'peaty' | 'smoky', string> = { peaty: '泥煤', smoky: '煙燻' }

const CLOSING_BAND_PHRASES: Record<Exclude<IntensityBand, 'none'>, string> = {
  light: '可以有一點',
  medium: '保留適中的存在感',
  bold: '可以明顯一些',
}

/**
 * Peat and smoke from the sliders, skipping any tag the free text already
 * covered: natural language outranks the sliders in the conversation (§4.8).
 */
function describeIntensityForClosing(preference: Preference): string[] {
  const mentioned = new Set<FlavorTag>([
    ...preference.taste.map((item) => item.tag),
    ...preference.dislikes,
  ])
  const unwanted: string[] = []
  const phrases: string[] = []
  for (const key of ['peaty', 'smoky'] as const) {
    const value = preference.intensity?.[key]
    if (value === undefined || mentioned.has(key)) {
      continue
    }
    const band = intensityBand(value)
    if (band === 'none') {
      unwanted.push(INTENSITY_SUBJECTS[key])
    } else {
      phrases.push(`${INTENSITY_SUBJECTS[key]}${CLOSING_BAND_PHRASES[band]}`)
    }
  }
  return [...(unwanted.length > 0 ? [`不要${unwanted.join('與')}`] : []), ...phrases]
}

/** The Sommelier's wrap-up after Step 2, built from the merged Preference. */
export function composeClosingMessage(preference: Preference): string[] {
  const parts: string[] = []

  const leading = preference.taste.filter((item) => item.level !== 'low')
  const subtle = preference.taste.filter((item) => item.level === 'low')
  if (leading.length > 0) {
    parts.push(`${leading.map((item) => FLAVOR_DIRECTIONS[item.tag]).join('、')}為主`)
  }
  if (subtle.length > 0) {
    parts.push(`帶一點${subtle.map((item) => FLAVOR_DIRECTIONS[item.tag]).join('、')}`)
  }
  if (preference.dislikes.length > 0) {
    const avoided = preference.dislikes.map((tag) =>
      SMOKE_AND_PEAT.includes(tag) ? `${FLAVOR_DIRECTIONS[tag]}感` : FLAVOR_TAG_LABELS[tag],
    )
    parts.push(`避開${avoided.join('、')}`)
  }
  parts.push(...describeIntensityForClosing(preference))
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

export function describeTasteAnswer(taste: readonly FlavorTag[]): string[] {
  return [taste.map((tag) => FLAVOR_TAG_LABELS[tag]).join(' · ')]
}

export function describeIntensityAnswer(peaty: number, smoky: number): string[] {
  return [`泥煤 ${peaty} · 煙燻 ${smoky}`]
}

export function describeBudgetAnswer(max: number): string[] {
  return [`預算 ${formatPrice(max)}`]
}

export const SKIPPED_FREE_TEXT_ANSWER = '先這樣就好'

export function describeFreeTextAnswer(freeText: string | undefined): string[] {
  return [freeText || SKIPPED_FREE_TEXT_ANSWER]
}
