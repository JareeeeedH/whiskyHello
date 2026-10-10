import type {
  OccasionChoice,
  PreferenceOccasion,
  SommelierBudget,
  SommelierInput,
  SommelierInputDraft,
  StyleKey,
  StyleProfile,
  TasteKey,
  TasteProfile,
} from '../types/sommelier.ts'
import {
  OCCASION_OPTIONS,
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
 * Everything here is deterministic UX copy built from the user's own answers;
 * nothing here calls the LLM.
 */

/** 1-based position of a question in the conversation. */
export type ConversationStep = number

/** What each question asks for; `group` indexes TASTE_GROUPS. */
export type StepKind =
  | { type: 'pickTaste'; group: number }
  | { type: 'rateTaste' }
  | { type: 'style'; key: StyleKey }
  | { type: 'occasion' }
  | { type: 'budget' }
  | { type: 'freeText' }

/**
 * Both taste groups, one question rating all picked tastes together,
 * then style one at a time, occasion, budget and free text.
 */
export const CONVERSATION_STEPS: readonly StepKind[] = [
  ...TASTE_GROUPS.map((_, group): StepKind => ({ type: 'pickTaste', group })),
  { type: 'rateTaste' },
  ...STYLE_KEYS.map((key): StepKind => ({ type: 'style', key })),
  { type: 'occasion' },
  { type: 'budget' },
  { type: 'freeText' },
]

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

export interface QuestionPrompt {
  title: string
  hint?: string
}

const STYLE_QUESTIONS: Record<StyleKey, QuestionPrompt> = {
  body: { title: '你喜歡什麼樣的酒體？' },
  intensity: { title: '你偏好柔和一點，還是風味更鮮明的酒？', hint: '指的是整體風味的強弱，不是酒精濃度。' },
  smoothness: { title: '你比較喜歡圓潤順口，還是帶點粗獷個性的口感？' },
}

export function getQuestion(kind: StepKind): QuestionPrompt {
  switch (kind.type) {
    case 'pickTaste':
      return kind.group === 0
        ? { title: '這次，你最想在威士忌中喝到哪些風味？', hint: '選 3～4 種就好，挑出這次最想感受到的味道。' }
        : { title: '再看看這幾種，有沒有也想喝到的？', hint: '兩組加起來選 3～5 種，這組沒有也沒關係。' }
    case 'rateTaste':
      return {
        title: '你希望這些風味在這杯威士忌中各有多明顯？',
        hint: '1 是淡淡帶到即可，5 是明顯感受得到，10 是希望成為主要風味。',
      }
    case 'style':
      return STYLE_QUESTIONS[kind.key]
    case 'occasion':
      return { title: '這次是在什麼情境下喝呢？', hint: '選一個最接近的就好。' }
    case 'budget':
      return { title: '這次大概想把預算控制在哪裡？' }
    case 'freeText':
      return { title: '還有什麼想告訴我的嗎？', hint: '可以告訴我今晚的心情、場合，或任何你想補充的需求。' }
  }
}

/** Pause between the user's message landing and the thinking state appearing. */
export const USER_TO_THINKING_MS = 500
/** Pause between consecutive Sommelier messages, e.g. the greeting and the first question. */
export const BETWEEN_MESSAGES_MS = 750
/** Pause before the reply input slides in under a new question. */
export const QUESTION_TO_INPUT_MS = 400
/** After this long, a still-pending recommendation request swaps to a reassuring thinking line. */
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

export type ThinkingMoment = 'opening' | StepKind['type'] | 'profile' | 'recommend' | 'retry'

/**
 * Keyed by the kind of question just answered; `freeText` leads to the closing
 * message, `recommend` and `retry` cover the recommendation request.
 * One line is picked at random each time; '' shows the dots on their own.
 */
const THINKING_CUES: Record<ThinkingMoment, { texts: string[]; durationMs: number }> = {
  opening: { texts: [''], durationMs: 1000 },
  pickTaste: { texts: ['', '嗯，這幾個不錯…', '我看看…'], durationMs: 900 },
  rateTaste: { texts: ['好，記下了…', '嗯，有點輪廓了…', '我想想…'], durationMs: 1200 },
  style: { texts: ['', '嗯…', '了解…'], durationMs: 900 },
  occasion: { texts: ['', '好的…', '了解…'], durationMs: 900 },
  budget: { texts: ['', '了解…', '我記一下…'], durationMs: 900 },
  freeText: {
    texts: ['嗯，我大概抓到你的方向了…', '好，我差不多有個方向了…', '讓我把這些拼起來…'],
    durationMs: 1700,
  },
  profile: { texts: ['我幫你整理一下……', '稍等，我把它寫下來…'], durationMs: 1400 },
  recommend: {
    texts: ['我在幫你挑酒…', '讓我想想哪兩支最適合…', '我翻一下酒單…'],
    durationMs: 1700,
  },
  retry: { texts: ['再試一次，稍等我一下…', '我再挑一次…'], durationMs: 1400 },
}

export const LONG_WAIT_TEXT = '還在幫你比對，再等我一下…'

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

/** Rated tastes in a band; unrated tastes are unspecified and never counted. */
function tastesInBand(taste: TasteProfile, band: RatingBand): string[] {
  return TASTE_KEYS.filter((key) => {
    const value = taste[key]
    return value !== undefined && ratingBand(value) === band
  }).map((key) => TASTE_LABELS[key])
}

/** The Sommelier's wrap-up, built from the validated answers. */
export function composeClosingMessage(input: SommelierInput): string[] {
  const parts: string[] = []

  const high = tastesInBand(input.taste, 'high')
  const low = tastesInBand(input.taste, 'low')
  if (high.length > 0) {
    parts.push(`${high.join('、')}為主`)
  }
  if (low.length > 0) {
    parts.push(`${low.join('、')}淡淡帶到`)
  }
  parts.push(
    ...STYLE_KEYS.map((key) => ({ key, band: ratingBand(input.style[key]) }))
      .filter((item) => item.band !== 'mid')
      .map((item) => STYLE_PHRASES[item.key][item.band]),
  )
  if (input.budget) {
    parts.push(`預算大約 ${formatBudget(input.budget)}`)
  }

  return [
    '好，我大概知道今天的方向了。',
    ...(parts.length > 0 ? [`${parts.join('，')}。`] : []),
    ...(input.occasion ? [`我也記下了：情境是${PREFERENCE_OCCASION_LABELS[input.occasion]}。`] : []),
    '我先把今天的方向整理成一份偏好輪廓給你。',
  ]
}

/** When the LLM finds no suitable pair; its short reason sits in the middle when given. */
export function composeUnableMessage(reason: string | undefined): string[] {
  return [
    '這次的條件比較特別，我暫時挑不到合適的兩支。',
    ...(reason ? [reason] : []),
    '要不要調整一下需求，再讓我挑一次？',
  ]
}

export const SKIPPED_TASTE_GROUP_ANSWER = '這組先跳過'

/** The picks made in one group; an empty group is a skip, not an error. */
export function describeTastePicks(keys: readonly TasteKey[]): string[] {
  return [keys.length > 0 ? keys.map((key) => TASTE_LABELS[key]).join(' · ') : SKIPPED_TASTE_GROUP_ANSWER]
}

/** Every picked taste with its rating, in display order. */
export function describeTasteRatings(taste: TasteProfile): string[] {
  return [pickedTastes(taste).map((key) => `${TASTE_LABELS[key]} ${taste[key]}`).join(' · ')]
}

export function describeStyleAnswer(style: StyleProfile, key: StyleKey): string[] {
  return [`${STYLE_LABELS[key]} ${style[key]} / ${RATING_MAX}`]
}

export function describeOccasionAnswer(choice: OccasionChoice): string[] {
  const option = OCCASION_OPTIONS.find((item) => item.value === choice)
  return option ? [`${option.icon} ${option.label}`] : []
}

export function describeBudgetAnswer(max: number): string[] {
  return [`預算 ${formatPrice(max)}`]
}

/** At most this many short reactions per conversation, so they never feel scripted. */
export const MAX_ACKNOWLEDGEMENTS = 3

type AcknowledgementValues = Pick<SommelierInputDraft, 'taste' | 'style' | 'occasion' | 'budget'>

const OCCASION_REACTIONS: Partial<Record<PreferenceOccasion, string>> = {
  tasting: '專心品飲的話，就挑一支值得細細喝的。',
  date: '約會啊，那就選一支氣氛好的。',
  gift: '送禮的話，我會留意一下體面一點的。',
  celebration: '慶祝的話，就來點特別的吧。',
}

const PICK_PAIRS: Record<number, { keys: [TasteKey, TasteKey]; lines: string[] }[]> = {
  0: [
    { keys: ['fruit', 'floral'], lines: ['果香加花香，很清新的組合。', '果香配花香，聽起來很明亮。'] },
    { keys: ['sweet', 'maltGrain'], lines: ['甜香配麥芽，溫和好入口的方向。'] },
    { keys: ['sweet', 'nutty'], lines: ['甜香加堅果，有點像剛烤好的點心。'] },
  ],
  1: [
    { keys: ['peat', 'smoke'], lines: ['喔，喜歡有煙燻個性的。', '泥煤加煙燻，有點重口味喔。'] },
    { keys: ['chocolateCoffee', 'spice'], lines: ['巧克力配香料，很溫暖的味道。'] },
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

/** Reacts to the first very pronounced taste, else the first very light one. */
function reactToRatings(taste: TasteProfile, random: () => number): string | null {
  if ((taste.peat ?? 0) >= 9) {
    return '泥煤給到這麼高，看來是重口味玩家。'
  }
  const picked = pickedTastes(taste)
  const main = picked.find((key) => (taste[key] ?? 0) >= 9)
  if (main) {
    const label = TASTE_LABELS[main]
    return pickLine([`${label}要當主角，懂了。`, `那就讓${label}站到最前面。`], random)
  }
  const light = picked.find((key) => (taste[key] ?? RATING_MAX) <= 2)
  return light ? `${TASTE_LABELS[light]}淡淡帶到就好，記下了。` : null
}

/**
 * A short reaction to a distinctive answer, or null for an ordinary one.
 * Scripted on purpose: no LLM call, so it's instant and predictable.
 */
export function getAcknowledgement(
  kind: StepKind,
  values: AcknowledgementValues,
  random: () => number = Math.random,
): string | null {
  switch (kind.type) {
    case 'pickTaste': {
      const picks = pickedTastes(values.taste, TASTE_GROUPS[kind.group] ?? [])
      const pair = PICK_PAIRS[kind.group]?.find(({ keys }) => keys.every((key) => picks.includes(key)))
      return pair ? pickLine(pair.lines, random) : null
    }
    case 'rateTaste':
      return reactToRatings(values.taste, random)
    case 'style': {
      const band = ratingBand(values.style[kind.key])
      return band === 'mid' ? null : pickLine(STYLE_REACTIONS[kind.key][band], random)
    }
    case 'occasion':
      return values.occasion && values.occasion !== 'none'
        ? (OCCASION_REACTIONS[values.occasion] ?? null)
        : null
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
