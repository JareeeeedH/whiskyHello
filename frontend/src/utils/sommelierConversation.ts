/**
 * Scripted Sommelier lines and pacing for the conversation.
 * Everything here is fixed UX copy; nothing here calls the LLM.
 */

/** Longest message the backend accepts (MESSAGE_MAX_LENGTH in the backend). */
export const MESSAGE_MAX_LENGTH = 500

/** How long the "Sommelier is on the way" state stays before the conversation opens. */
export const SOMMELIER_ARRIVAL_MS = 2000
export const SOMMELIER_ARRIVAL_TEXT = { en: 'Sommelier is coming…', zh: '侍酒師正在過來…' } as const

const ASK_LINE = '說說你這次想找什麼樣的威士忌？'

/** Faint text in the empty message box: what the user can talk about. */
export const MESSAGE_PLACEHOLDER = '今天想喝點什麼？風味、心情、喝過喜歡的酒都可以跟我說'

/** The opening lines follow the visitor's local time of day. */
export function getSommelierGreeting(hour: number): string[] {
  if (hour >= 5 && hour < 11) {
    return ['早安，我是今天的侍酒師。', ASK_LINE]
  }
  if (hour >= 11 && hour < 17) {
    return ['午安，我是今天的侍酒師。', ASK_LINE]
  }
  if (hour >= 17) {
    return ['嗨，我是今晚的侍酒師。', ASK_LINE]
  }
  return ['這麼晚還沒睡呀，我是今晚的侍酒師。', ASK_LINE]
}

/** Pause between the user's message landing and the thinking state appearing. */
export const USER_TO_THINKING_MS = 500
/** Pause before the reply input slides in. */
export const QUESTION_TO_INPUT_MS = 400
/** After this long, a still-pending retry swaps to a reassuring thinking line. */
export const LONG_WAIT_MS = 4000
export const LONG_WAIT_TEXT = '還在幫你比對，再等我一下…'

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

export type ThinkingMoment = 'opening' | 'retry'

/** One line is picked at random each time; '' shows the dots on their own. */
const THINKING_CUES: Record<ThinkingMoment, { texts: string[]; durationMs: number }> = {
  opening: { texts: [''], durationMs: 1000 },
  retry: { texts: ['再試一次，稍等我一下…', '我再挑一次…'], durationMs: 1400 },
}

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

/** Each selection step stays up this long, so every step is readable before the cards appear. */
export const SELECTION_STEP_MS = 2200
/** How long the last step may hold, while the request is still pending, before a reassuring line. */
export const SELECTION_LONG_WAIT_MS = 6000
export const SELECTION_LONG_WAIT_TEXT = '這幾支有點難選，再給我幾秒…'

/**
 * What the Sommelier does while the request runs, in the order the backend does it:
 * rewrite the message, search the critic notes, rerank, write the cards.
 */
export const SELECTION_STEPS: readonly string[] = [
  '先把你的描述，整理成品飲筆記的說法…',
  '從一萬多篇評論家筆記裡，找風味最接近的…',
  '再一篇篇細讀，挑出最貼近的三支…',
  '最後幫每一支寫下推薦理由…',
]

/** Shown as the user's message: the text as typed, one line per paragraph, blank lines dropped. */
export function describeMessage(message: string): string[] {
  return message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}
