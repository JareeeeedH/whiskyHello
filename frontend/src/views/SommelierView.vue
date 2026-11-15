<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import SiteFooter from '../components/SiteFooter.vue'
import SommelierAvatar from '../components/SommelierAvatar.vue'
import SommelierRecommendations from '../components/SommelierRecommendations.vue'
import {
  GUEST_LIMIT_CODE,
  SommelierApiError,
  fetchRecommendations,
} from '../services/sommelierService'
import type { RecommendationResult, WhiskyRecommendation } from '../types/sommelier'
import {
  LONG_WAIT_MS,
  LONG_WAIT_TEXT,
  MESSAGE_MAX_LENGTH,
  MESSAGE_PLACEHOLDER,
  QUESTION_TO_INPUT_MS,
  SELECTION_LONG_WAIT_MS,
  SELECTION_LONG_WAIT_TEXT,
  SELECTION_STEP_MS,
  SELECTION_STEPS,
  SOMMELIER_ARRIVAL_MS,
  SOMMELIER_ARRIVAL_TEXT,
  USER_TO_THINKING_MS,
  describeMessage,
  getSommelierGreeting,
  getThinkingCue,
  getThinkingDurationMs,
  type ThinkingMoment,
} from '../utils/sommelierConversation'

const router = useRouter()

/**
 * opening → answering ⇄ responding: after every reply the message box comes back, so the
 * user can keep asking. `error` replaces `answering` when the recommendation API fails.
 */
type Phase = 'opening' | 'answering' | 'responding' | 'error'

interface SommelierMessage {
  id: number
  type: 'sommelier'
  lines: string[]
  /** The greeting; its last line is styled as the question. */
  greeting?: boolean
  /** The greeting and errors become the auto-scroll reading position. */
  anchor?: boolean
  tone?: 'error'
  details?: string[]
}

interface UserMessage {
  id: number
  type: 'user'
  lines: string[]
  /** The message as sent, put back in the box when the user edits it. */
  text: string
}

interface ThinkingMessage {
  id: number
  type: 'thinking'
  text: string
}

/** Each round keeps its own cards, so earlier answers stay as they were. */
interface SystemMessage {
  id: number
  type: 'system'
  content: 'recommendations'
  recommendations: WhiskyRecommendation[]
}

type ChatMessage = SommelierMessage | UserMessage | ThinkingMessage | SystemMessage
type NewMessage = ChatMessage extends infer T ? (T extends ChatMessage ? Omit<T, 'id'> : never) : never
type Author = 'sommelier' | 'user'

type RecommendationOutcome =
  | { ok: true; result: RecommendationResult }
  | { ok: false; message: string; details: string[] }

/** How long the reply input takes to fade out before the user's message appears. */
const REPLY_EXIT_MS = 180
const SCROLL_MARGIN_TOP = 16
const SCROLL_MARGIN_BOTTOM = 24
const RECOMMENDATION_ERROR_FALLBACK = '推薦暫時無法使用，請稍後再試'
const RECOMMENDATION_ERROR_INTRO = '抱歉，剛剛挑酒的時候出了點問題。'

/** The text in the message box; kept when the user goes back to edit it. */
const draft = ref('')
const messages = ref<ChatMessage[]>([])
const phase = ref<Phase>('opening')
/** True while the Sommelier is "on the way", before the first message. */
const arriving = ref(true)
/** The message sent for recommendations, kept for a retry. */
const submittedMessage = ref<string | null>(null)
const chatRef = ref<HTMLElement | null>(null)
const replyRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const endRef = ref<HTMLElement | null>(null)
/** Holds the chat height while the reply input is swapped out, so the scroll position never snaps. */
const heldHeight = ref('')

let messageId = 0
/** Bumped on every rewind; an async turn stops as soon as its token is stale. */
let flowToken = 0
let timers: ReturnType<typeof setTimeout>[] = []
let focusReplyOnEnter = false

const trimmedLength = computed(() => draft.value.trim().length)
const canSend = computed(() => trimmedLength.value > 0 && trimmedLength.value <= MESSAGE_MAX_LENGTH)
const canModify = computed(() => phase.value === 'answering' || phase.value === 'error')
/** Only the latest message can be edited; editing it takes back that round. */
const lastUserMessageId = computed(() => [...messages.value].reverse().find((message) => message.type === 'user')?.id)
const replyVisible = computed(() => phase.value !== 'opening' && phase.value !== 'responding')
const replyLabel = computed(() => (phase.value === 'answering' ? '回覆侍酒師' : '下一步'))

onMounted(() => {
  void openConversation()
})

onBeforeUnmount(() => {
  flowToken++
  clearTimers()
})

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    timers.push(setTimeout(resolve, ms))
  })
}

function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function authorOf(message: ChatMessage): Author {
  return message.type === 'user' ? 'user' : 'sommelier'
}

/** Consecutive messages from the same author share one avatar and label. */
function isGroupStart(index: number): boolean {
  const previous = messages.value[index - 1]
  const current = messages.value[index]
  return !previous || !current || authorOf(previous) !== authorOf(current)
}

function isAnchor(message: ChatMessage): boolean {
  return message.type === 'user' || message.type === 'system' || (message.type === 'sommelier' && Boolean(message.anchor))
}

function addMessage(message: NewMessage): number {
  const id = ++messageId
  messages.value.push({ ...message, id })
  void revealLatest()
  return id
}

/** Swaps a message in place, so a thinking state turns into the reply under the same avatar. */
function replaceMessage(id: number, message: NewMessage) {
  const index = messages.value.findIndex((item) => item.id === id)
  if (index !== -1) {
    messages.value.splice(index, 1, { ...message, id })
    void revealLatest()
  }
}

function setThinkingText(id: number, text: string) {
  const message = messages.value.find((item) => item.id === id)
  if (message?.type === 'thinking') {
    message.text = text
  }
}

/**
 * Scrolls just enough to show the end of the conversation without pushing the
 * latest anchor (the user's message, the greeting, …) off the top of the screen.
 * Scrolls up only when that anchor is already out of view.
 */
async function revealLatest() {
  await nextTick()
  const chat = chatRef.value
  const end = endRef.value
  if (!chat || !end) {
    return
  }

  const anchors = chat.querySelectorAll<HTMLElement>('[data-anchor]')
  const anchor = anchors[anchors.length - 1]
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight
  const minTop = SCROLL_MARGIN_TOP

  let delta = Math.max(0, end.getBoundingClientRect().bottom - (viewportHeight - SCROLL_MARGIN_BOTTOM))
  if (anchor) {
    delta = Math.min(delta, anchor.getBoundingClientRect().top - minTop)
  }
  if (Math.abs(delta) >= 1) {
    window.scrollBy({ top: delta, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }
}

function holdHeight() {
  const height = chatRef.value?.offsetHeight
  heldHeight.value = height ? `${height}px` : ''
}

async function releaseHeight() {
  await nextTick()
  heldHeight.value = ''
}

function onReplyEnter() {
  void revealLatest()
}

function onReplyAfterEnter() {
  if (focusReplyOnEnter) {
    focusReplyOnEnter = false
    ;(inputRef.value ?? replyRef.value)?.focus({ preventScroll: true })
  }
}

/** Hides the reply input and returns the token for the Sommelier turn that follows. */
async function beginTurn(): Promise<number | null> {
  const token = flowToken
  holdHeight()
  phase.value = 'responding'
  await wait(REPLY_EXIT_MS)
  return token === flowToken ? token : null
}

/**
 * Shows the thinking state after a short pause and keeps it up for at least
 * the cue duration (longer for a longer `upcomingText`), or until `work`
 * settles if that takes longer.
 */
async function thinkWhile<T>(
  moment: ThinkingMoment,
  token: number,
  work: Promise<T>,
  upcomingText = '',
): Promise<{ id: number; result: T } | null> {
  await wait(USER_TO_THINKING_MS)
  if (token !== flowToken) {
    return null
  }

  const cue = getThinkingCue(moment)
  const id = addMessage({ type: 'thinking', text: cue.text })
  const longWait = setTimeout(() => setThinkingText(id, LONG_WAIT_TEXT), LONG_WAIT_MS)
  timers.push(longWait)
  const [result] = await Promise.all([work, wait(getThinkingDurationMs(moment, upcomingText))])
  clearTimeout(longWait)
  return token === flowToken ? { id, result } : null
}

/**
 * Rotates the thinking line through `steps` while `work` runs. Every step stays
 * up for SELECTION_STEP_MS even when `work` settles sooner; the last one holds
 * until it settles, then gives way to a reassuring line if that takes long.
 * A result that `stopEarly` accepts ends the rotation at once (nothing was searched).
 */
async function thinkThroughSteps<T>(
  steps: readonly string[],
  token: number,
  work: Promise<T>,
  stopEarly: (result: T) => boolean = () => false,
): Promise<{ id: number; result: T } | null> {
  await wait(USER_TO_THINKING_MS)
  if (token !== flowToken) {
    return null
  }

  const id = addMessage({ type: 'thinking', text: steps[0] ?? '' })
  let longWait: ReturnType<typeof setTimeout> | undefined
  const rotation = (async () => {
    for (const step of steps.slice(1)) {
      await wait(SELECTION_STEP_MS)
      setThinkingText(id, step)
    }
    await wait(SELECTION_STEP_MS)
    longWait = setTimeout(() => setThinkingText(id, SELECTION_LONG_WAIT_TEXT), SELECTION_LONG_WAIT_MS)
    timers.push(longWait)
  })()
  const early = work.then((value) => (stopEarly(value) ? value : new Promise<never>(() => {})))
  const result = await Promise.race([Promise.all([work, rotation]).then(([value]) => value), early])
  clearTimeout(longWait)
  return token === flowToken ? { id, result } : null
}

async function showReply(next: Phase, token: number, focus = true) {
  await wait(QUESTION_TO_INPUT_MS)
  if (token !== flowToken) {
    return
  }
  focusReplyOnEnter = focus
  phase.value = next
  await releaseHeight()
}

async function openConversation() {
  const token = flowToken
  await wait(SOMMELIER_ARRIVAL_MS)
  if (token !== flowToken) {
    return
  }
  arriving.value = false
  const greeting = getSommelierGreeting(new Date().getHours())
  const thought = await thinkWhile('opening', token, Promise.resolve(), greeting.join(''))
  if (!thought) {
    return
  }
  replaceMessage(thought.id, { type: 'sommelier', lines: greeting, greeting: true, anchor: true })
  await showReply('answering', token, false)
}

/** Enter sends; Shift+Enter starts a new line; Enter that confirms an IME word does neither. */
function onMessageKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
    return
  }
  event.preventDefault()
  void onSend()
}

async function onSend() {
  if (phase.value !== 'answering' || !canSend.value) {
    return
  }
  const message = draft.value.trim()
  const token = await beginTurn()
  if (token === null) {
    return
  }
  addMessage({ type: 'user', lines: describeMessage(message), text: message })
  submittedMessage.value = message
  await deliverRecommendations(message, token, false)
}

function isOffTopic(outcome: RecommendationOutcome): boolean {
  return outcome.ok && outcome.result.status === 'off_topic'
}

async function requestRecommendations(message: string): Promise<RecommendationOutcome> {
  try {
    return { ok: true, result: await fetchRecommendations({ message }) }
  } catch (error) {
    // Guests who used up today's free recommendations go straight to login (then home).
    if (error instanceof SommelierApiError && error.code === GUEST_LIMIT_CODE) {
      void router.push({ name: 'login' })
    }
    if (error instanceof SommelierApiError) {
      return { ok: false, message: error.message, details: error.details }
    }
    return { ok: false, message: RECOMMENDATION_ERROR_FALLBACK, details: [] }
  }
}

/**
 * Calls the recommendation API while the Sommelier narrates its steps (or, on a
 * retry, simply thinks), then shows the cards or an error.
 */
async function deliverRecommendations(message: string, token: number, retry: boolean) {
  const work = requestRecommendations(message)
  const thought = retry
    ? await thinkWhile('retry', token, work)
    : await thinkThroughSteps(SELECTION_STEPS, token, work, isOffTopic)
  if (!thought) {
    return
  }

  const outcome = thought.result
  if (!outcome.ok) {
    replaceMessage(thought.id, {
      type: 'sommelier',
      lines: [RECOMMENDATION_ERROR_INTRO, outcome.message],
      details: outcome.details,
      tone: 'error',
      anchor: true,
    })
    await showReply('error', token)
    return
  }

  // Not a whisky request: the Sommelier says what it can do, and the box comes back empty.
  if (outcome.result.status === 'off_topic') {
    submittedMessage.value = null
    draft.value = ''
    replaceMessage(thought.id, { type: 'sommelier', lines: [outcome.result.message], anchor: true })
    await showReply('answering', token)
    return
  }

  // The cards stay in the conversation and an empty box comes back for the next question.
  // No focus: the cards are what the user should read first.
  submittedMessage.value = null
  draft.value = ''
  replaceMessage(thought.id, {
    type: 'system',
    content: 'recommendations',
    recommendations: outcome.result.recommendations,
  })
  await showReply('answering', token, false)
}

async function onRetry() {
  const message = submittedMessage.value
  if (phase.value !== 'error' || !message) {
    return
  }
  const token = await beginTurn()
  if (token !== null) {
    await deliverRecommendations(message, token, true)
  }
}

/** Takes back the latest round: its message returns to the box, ready to edit; earlier rounds stay. */
function onEditMessage() {
  const index = messages.value.findIndex((message) => message.id === lastUserMessageId.value)
  const message = messages.value[index]
  if (message?.type !== 'user') {
    return
  }

  flowToken++
  clearTimers()
  heldHeight.value = ''
  draft.value = message.text
  submittedMessage.value = null
  messages.value = messages.value.slice(0, index)
  focusReplyOnEnter = true
  phase.value = 'answering'
  void revealLatest()
}
</script>

<template>
  <main class="sommelier-view">
    <section class="discovery-hero" aria-labelledby="sommelier-title">
      <div class="discovery-hero-glow" aria-hidden="true" />
      <div class="discovery-hero-inner">
        <header class="page-header">
          <p class="eyebrow"><span class="eyebrow-mark" /> WHISKYHELLO · SOMMELIER</p>
          <h1 id="sommelier-title">威士忌推薦</h1>
          <p class="lead">喜歡泥煤、雪莉桶、果香，還是想找一支像你喝過的那款？告訴侍酒師。</p>
        </header>
      </div>
    </section>

    <div class="luxury-rule" aria-hidden="true" />

    <section
      ref="chatRef"
      class="chat"
      aria-label="與侍酒師的對話"
      :style="{ minHeight: heldHeight || undefined, '--reply-exit': `${REPLY_EXIT_MS}ms` }"
    >
      <Transition name="arrival" appear>
        <p v-if="arriving" class="arrival" role="status">
          <span class="avatar is-arriving"><SommelierAvatar /></span>
          <span class="arrival-text">
            <span class="arrival-en" lang="en">{{ SOMMELIER_ARRIVAL_TEXT.en }}</span>
            <span class="arrival-zh">
              {{ SOMMELIER_ARRIVAL_TEXT.zh }}
              <span class="thinking-dots" aria-hidden="true"><i /><i /><i /></span>
            </span>
          </span>
        </p>
      </Transition>

      <TransitionGroup tag="ol" name="msg" class="transcript" aria-live="polite">
        <li
          v-for="(message, index) in messages"
          :key="message.id"
          class="msg"
          :class="[`from-${authorOf(message)}`, { 'is-group-start': isGroupStart(index) }]"
          :data-anchor="isAnchor(message) || undefined"
        >
          <template v-if="message.type === 'user'">
            <span v-if="isGroupStart(index)" class="msg-label">YOU</span>
            <div class="user-row">
              <button
                v-if="canModify && message.id === lastUserMessageId"
                type="button"
                class="modify-link"
                aria-label="修改描述"
                @click="onEditMessage"
              >
                修改
              </button>
              <p class="user-bubble">
                <span v-for="(line, lineIndex) in message.lines" :key="lineIndex" class="user-line">
                  {{ line }}
                </span>
              </p>
            </div>
          </template>

          <template v-else>
            <!-- The cards are wider than the chat column, so they carry their own avatar row. -->
            <template v-if="isGroupStart(index) && message.type !== 'system'">
              <span class="avatar"><SommelierAvatar /></span>
              <span class="msg-label">SOMMELIER</span>
            </template>
            <Transition name="swap" mode="out-in">
              <p
                v-if="message.type === 'thinking'"
                key="thinking"
                class="msg-body thinking-line"
                role="status"
              >
                <Transition name="swap" mode="out-in">
                  <span v-if="message.text" :key="message.text">{{ message.text }}</span>
                </Transition>
                <span class="thinking-dots" aria-hidden="true"><i /><i /><i /></span>
                <span v-if="!message.text" class="sr-only">思考中</span>
              </p>
              <div
                v-else-if="message.type === 'system'"
                key="system"
                class="msg-body is-wide"
                :class="{ 'is-showcase': message.content === 'recommendations' }"
              >
                <div class="showcase-author">
                  <span class="avatar"><SommelierAvatar /></span>
                  <span class="msg-label">SOMMELIER</span>
                </div>
                <SommelierRecommendations
                  v-if="message.content === 'recommendations'"
                  :recommendations="message.recommendations"
                />
              </div>
              <div
                v-else
                key="sommelier"
                class="msg-body"
                :class="{ 'is-error': message.tone === 'error' }"
              >
                <p
                  v-for="(line, lineIndex) in message.lines"
                  :key="lineIndex"
                  class="msg-line"
                  :class="{ question: message.greeting && lineIndex === message.lines.length - 1 }"
                >
                  {{ line }}
                </p>
                <ul v-if="message.details?.length" class="error-details">
                  <li v-for="detail in message.details" :key="detail">{{ detail }}</li>
                </ul>
              </div>
            </Transition>
          </template>
        </li>
      </TransitionGroup>

      <Transition name="reply" mode="out-in" @enter="onReplyEnter" @after-enter="onReplyAfterEnter">
        <div
          v-if="replyVisible"
          :key="phase"
          ref="replyRef"
          class="reply"
          :class="{ 'is-plain': phase !== 'answering' }"
          role="group"
          tabindex="-1"
          :aria-label="replyLabel"
        >
          <template v-if="phase === 'answering'">
            <label for="sommelier-message" class="sr-only">描述你想喝的威士忌</label>
            <textarea
              id="sommelier-message"
              ref="inputRef"
              v-model="draft"
              class="message-input"
              rows="3"
              :maxlength="MESSAGE_MAX_LENGTH"
              :placeholder="MESSAGE_PLACEHOLDER"
              enterkeyhint="send"
              @keydown="onMessageKeydown"
            />

            <div class="reply-actions">
              <span class="char-count" aria-live="polite">{{ trimmedLength }} / {{ MESSAGE_MAX_LENGTH }}</span>
              <Button
                type="button"
                label="幫我推薦"
                icon="pi pi-arrow-right"
                icon-pos="right"
                class="primary-btn is-gold"
                :disabled="!canSend"
                @click="onSend"
              />
            </div>
          </template>

          <div v-else-if="phase === 'error'" class="reply-actions">
            <Button
              type="button"
              label="修改描述"
              severity="secondary"
              text
              class="quiet-btn"
              @click="onEditMessage"
            />
            <Button
              type="button"
              label="重試"
              icon="pi pi-refresh"
              icon-pos="right"
              class="primary-btn"
              @click="onRetry"
            />
          </div>
        </div>
      </Transition>

      <div ref="endRef" aria-hidden="true" />
    </section>

    <SiteFooter />
  </main>
</template>

<style scoped>
.sommelier-view {
  --avatar-size: 2rem;
  --avatar-gap: 0.75rem;
  --msg-gap: 0.375rem;
  --group-gap: 1.75rem;
  --msg-max: 82%;
  --msg-enter: 380ms;
  --swap-exit: 120ms;
  --bubble: #f7f0e4;
  --bubble-line: rgba(201, 164, 106, 0.34);
  --tray-line: #ebe3d6;

  width: 100%;
  overflow-x: clip;
  color: var(--wh-ink);
  background: var(--wh-paper);
}

/* Hero */

.discovery-hero {
  position: relative;
  overflow: hidden;
  padding: 2.15rem 1.5rem 1.85rem;
  background:
    radial-gradient(ellipse 70% 90% at 8% 0%, rgba(180, 83, 9, 0.22), transparent 55%),
    radial-gradient(ellipse 50% 70% at 92% 80%, rgba(146, 64, 14, 0.16), transparent 50%),
    linear-gradient(160deg, #0c0a09 0%, #1c1917 48%, #292524 100%);
  color: #fafaf9;
  box-shadow: inset 0 -1px 0 rgba(251, 191, 36, 0.16);
}

.discovery-hero-glow {
  position: absolute;
  inset: auto -10% -50% auto;
  width: 42%;
  height: 90%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.12), transparent 70%);
  pointer-events: none;
}

.discovery-hero-inner {
  position: relative;
  z-index: 1;
  max-width: 820px;
  margin: 0 auto;
}

.page-header {
  max-width: 34rem;
}

.eyebrow {
  margin: 0 0 0.5rem;
  font-size: var(--fs-eyebrow);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #fbbf24;
}

.eyebrow-mark {
  display: inline-block;
  width: 1.15rem;
  height: 1px;
  margin: 0 0.45rem 0.2rem 0;
  background: #fbbf24;
}

.page-header h1 {
  margin: 0 0 0.4rem;
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: 600;
  line-height: 1.25;
  color: #fafaf9;
}

.lead {
  color: #d6d3d1;
  font-size: 1.02rem;
  line-height: 1.7;
}

.luxury-rule {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(180, 83, 9, 0.15) 18%,
    rgba(251, 191, 36, 0.55) 50%,
    rgba(180, 83, 9, 0.15) 82%,
    transparent 100%
  );
}

/* Chat */

.chat {
  max-width: 45rem;
  min-height: 70svh;
  margin: 0 auto;
  padding: 0 1.5rem 5rem;
  overflow-anchor: none;
}

.arrival {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin: 0;
  padding-top: 4rem;
}

.arrival-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.arrival-en {
  color: #b39566;
  font-size: var(--fs-eyebrow);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.arrival-zh {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--wh-muted);
  font-size: 0.9rem;
  letter-spacing: 0.04em;
}

.avatar.is-arriving {
  animation: arrival-glow 1.6s ease-in-out infinite;
}

@keyframes arrival-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(201, 164, 106, 0);
  }

  50% {
    box-shadow: 0 0 0 6px rgba(201, 164, 106, 0.2);
  }
}

.transcript {
  margin: 0;
  padding: 1.25rem 0 0;
  list-style: none;
}

.msg {
  margin-top: var(--msg-gap);
}

.msg.is-group-start {
  margin-top: var(--group-gap);
}

.msg:first-child {
  margin-top: 0;
}

.msg-label {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: var(--wh-faint);
}

/* Sommelier */

.msg.from-sommelier {
  display: grid;
  grid-template-columns: var(--avatar-size) minmax(0, 1fr);
  column-gap: var(--avatar-gap);
}

.avatar {
  display: block;
  flex: none;
  width: var(--avatar-size);
  height: var(--avatar-size);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(28, 25, 23, 0.18);
}

.from-sommelier .msg-label {
  display: flex;
  align-items: center;
  min-height: var(--avatar-size);
  color: #b39566;
}

.from-sommelier .msg-body {
  grid-column: 2;
  max-width: var(--msg-max);
  margin: 0;
}

.from-sommelier .msg-body.is-wide {
  max-width: none;
  margin-top: 0.25rem;
}

.from-sommelier .msg-body.is-showcase {
  grid-column: 1 / -1;
}

/* Avatar and label at the showcase's own left edge, lined up with the cards' title. */
.showcase-author {
  display: flex;
  align-items: center;
  gap: var(--avatar-gap);
  margin-bottom: 0.5rem;
}

/* Side-by-side cards need more room than the chat column: widen the showcase, still centred. */
@media (min-width: 900px) {
  .from-sommelier .msg-body.is-showcase {
    --showcase-width: min(64rem, calc(100vw - 3rem));
    width: var(--showcase-width);
    margin-inline: calc((100% - var(--showcase-width)) / 2);
  }
}

.question {
  margin: 0;
  color: var(--wh-ink);
  font-family: var(--font-display);
  font-size: 1.1875rem;
  font-weight: 600;
  line-height: 1.6;
  text-wrap: pretty;
}

.msg-line {
  margin: 0;
  color: var(--wh-ink-soft);
  font-size: 1rem;
  line-height: 1.8;
  text-wrap: pretty;
}

.msg-line + .msg-line {
  margin-top: 0.15rem;
}

.error-details {
  margin: 0.35rem 0 0;
  padding: 0;
  color: #b91c1c;
  font-size: 0.84rem;
  list-style: none;
}

.thinking-line {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 1.8rem;
  color: var(--wh-muted);
  font-size: 0.95rem;
  line-height: 1.8;
}

.thinking-dots {
  display: inline-flex;
  gap: 5px;
}

.thinking-dots i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--wh-gold);
  opacity: 0.25;
  animation: thinking-dot 1.2s ease-in-out infinite;
}

.thinking-dots i:nth-child(2) {
  animation-delay: 0.15s;
}

.thinking-dots i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes thinking-dot {
  0%,
  80%,
  100% {
    opacity: 0.25;
  }

  40% {
    opacity: 1;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* User */

.msg.from-user {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.from-user .msg-label {
  margin-bottom: 0.4rem;
}

.user-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  max-width: var(--msg-max);
}

.user-bubble {
  min-width: 0;
  margin: 0;
  padding: 0.55rem 0.95rem;
  border: 1px solid var(--bubble-line);
  border-radius: 16px 16px 4px 16px;
  background: var(--bubble);
  color: var(--wh-ink);
  font-size: 0.975rem;
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.user-line {
  display: block;
}

.modify-link {
  flex: none;
  padding: 0.35rem 0.25rem;
  border: none;
  background: none;
  color: var(--wh-faint);
  font: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 200ms ease,
    color 160ms ease;
}

.msg.from-user:hover .modify-link,
.modify-link:focus-visible {
  opacity: 1;
}

.modify-link:hover {
  color: var(--wh-ink-soft);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.modify-link:focus-visible {
  outline: 2px solid var(--wh-amber);
  outline-offset: 2px;
}

@media (hover: none) {
  .modify-link {
    opacity: 1;
  }
}

/* Motion */

.msg-enter-active,
.swap-enter-active,
.reply-enter-active,
.arrival-enter-active {
  transition:
    opacity var(--msg-enter) ease,
    transform var(--msg-enter) ease;
}

.msg-enter-from,
.swap-enter-from,
.reply-enter-from,
.arrival-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.swap-leave-active {
  transition: opacity var(--swap-exit) ease;
}

.reply-leave-active,
.arrival-leave-active {
  transition: opacity var(--reply-exit) ease;
}

.swap-leave-to,
.reply-leave-to,
.arrival-leave-to {
  opacity: 0;
}

/* Reply input */

.reply {
  margin-top: 2rem;
  padding: 1.125rem 1.25rem 1rem;
  border: 1px solid var(--tray-line);
  border-radius: 18px;
  background: #fff;
  box-shadow:
    0 1px 2px rgba(28, 25, 23, 0.04),
    0 10px 28px -20px rgba(28, 25, 23, 0.28);
  transition: border-color 200ms ease;
}

.reply:focus {
  outline: none;
}

.reply:focus-within {
  border-color: rgba(201, 164, 106, 0.6);
}

.reply.is-plain {
  padding: 0;
  border: none;
  background: none;
  box-shadow: none;
}

.reply-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.reply.is-plain .reply-actions {
  margin-top: 0;
}

/* The message box sits flush inside the reply tray, which draws the border and focus ring. */
.message-input {
  display: block;
  width: 100%;
  min-height: 5.25rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--wh-ink);
  font: inherit;
  font-size: 1rem;
  line-height: 1.7;
  resize: vertical;
}

.message-input:focus {
  outline: none;
}

.message-input::placeholder {
  color: var(--wh-faint);
}

.char-count {
  margin-right: auto;
  color: var(--wh-faint);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}

.quiet-btn {
  color: var(--wh-muted) !important;
}

/* Night-black with a gold hairline, like the best-match card; the arrow sits in a small gold ring. */
.primary-btn {
  --btn-bg: linear-gradient(180deg, #241c22 0%, var(--wh-night) 100%);
  --btn-line: rgba(220, 184, 120, 0.6);
  --btn-line-hover: rgba(220, 184, 120, 0.95);
  --btn-shadow: 0 6px 16px rgba(17, 13, 17, 0.16);
  --btn-shadow-hover: 0 10px 22px rgba(17, 13, 17, 0.24);
  --btn-icon-line: rgba(220, 184, 120, 0.5);
  --btn-icon-color: var(--wh-gold-bright);
  --btn-icon-hover: rgba(220, 184, 120, 0.14);

  min-width: 7.5rem;
  min-height: 2.75rem;
  gap: 0.85rem;
  padding: 0.45rem 0.5rem 0.45rem 1.35rem !important;
  border: 1px solid var(--btn-line) !important;
  border-radius: 10px !important;
  background: var(--btn-bg) !important;
  box-shadow: inset 0 1px 0 rgba(241, 233, 220, 0.08), var(--btn-shadow);
  color: var(--wh-cream) !important;
  font-weight: 600 !important;
  letter-spacing: 0.12em;
  transition:
    border-color 200ms ease,
    box-shadow 200ms ease,
    transform 200ms ease;
}

.primary-btn :deep(.p-button-icon) {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid var(--btn-icon-line);
  border-radius: 50%;
  color: var(--btn-icon-color);
  font-size: 0.7rem;
  transition:
    transform 200ms ease,
    background-color 200ms ease;
}

.primary-btn:not(:disabled):hover {
  border-color: var(--btn-line-hover) !important;
  background: var(--btn-bg) !important;
  box-shadow: inset 0 1px 0 rgba(241, 233, 220, 0.08), var(--btn-shadow-hover);
  transform: translateY(-1px);
}

.primary-btn:not(:disabled):hover :deep(.p-button-icon) {
  background: var(--btn-icon-hover);
  transform: translateX(3px);
}

.primary-btn:not(:disabled):active {
  transform: translateY(0) scale(0.98);
}

.primary-btn:focus-visible {
  outline: 2px solid var(--wh-gold) !important;
  outline-offset: 3px;
}

.primary-btn:disabled {
  border-color: #ddd3c3 !important;
  background: transparent !important;
  box-shadow: none;
  color: var(--wh-faint) !important;
  opacity: 1;
}

.primary-btn:disabled :deep(.p-button-icon) {
  border-color: #ddd3c3;
  color: var(--wh-faint);
}

/* Reserved for the one step that matters most: asking for the recommendations. */
.primary-btn.is-gold {
  --btn-bg: linear-gradient(180deg, #e4c78d 0%, var(--wh-gold) 100%);
  --btn-line: #b8914f;
  --btn-line-hover: #a07a3c;
  --btn-shadow: 0 8px 20px rgba(161, 98, 7, 0.2);
  --btn-shadow-hover: 0 12px 26px rgba(161, 98, 7, 0.28);
  --btn-icon-line: rgba(17, 13, 17, 0.35);
  --btn-icon-color: var(--wh-night);
  --btn-icon-hover: rgba(17, 13, 17, 0.08);

  color: var(--wh-night) !important;
}

@media (max-width: 640px) {
  .sommelier-view {
    --avatar-size: 1.75rem;
    --avatar-gap: 0.625rem;
    --group-gap: 1.375rem;
    --msg-max: 85%;
  }

  .discovery-hero {
    padding: 1rem 1rem 0.9rem;
  }

  .eyebrow {
    margin-bottom: 0.3rem;
    font-size: 0.72rem;
  }

  .page-header h1 {
    margin-bottom: 0.25rem;
    font-size: 1.875rem;
  }

  .lead {
    font-size: 0.875rem;
    line-height: 1.55;
  }

  .chat {
    padding: 0 1rem 3rem;
  }

  .transcript {
    padding-top: 1rem;
  }

  .question {
    font-size: 1.0625rem;
  }

  .msg-line,
  .user-bubble {
    font-size: 0.95rem;
  }

  .reply {
    margin-top: 1.5rem;
    padding: 1rem 1rem 0.875rem;
    border-radius: 16px;
  }

  .reply-actions .primary-btn {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .modify-link,
  .reply,
  .primary-btn,
  .primary-btn :deep(.p-button-icon) {
    transition: none;
  }

  .primary-btn:not(:disabled):hover,
  .primary-btn:not(:disabled):active,
  .primary-btn:not(:disabled):hover :deep(.p-button-icon) {
    transform: none;
  }

  .msg-enter-active,
  .swap-enter-active,
  .swap-leave-active,
  .reply-enter-active,
  .reply-leave-active,
  .arrival-enter-active,
  .arrival-leave-active {
    transition: none;
  }

  .avatar.is-arriving {
    animation: none;
  }

  .thinking-dots i {
    animation: none;
    opacity: 0.6;
  }
}
</style>
