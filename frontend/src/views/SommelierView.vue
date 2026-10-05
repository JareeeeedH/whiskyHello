<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import SiteFooter from '../components/SiteFooter.vue'
import SommelierAvatar from '../components/SommelierAvatar.vue'
import SommelierPreferenceProfile from '../components/SommelierPreferenceProfile.vue'
import { SommelierApiError, fetchPreference } from '../services/sommelierService'
import type {
  FlavorTag,
  Preference,
  SommelierInput,
  SommelierInputDraft,
  SommelierInputErrors,
  SommelierInputField,
} from '../types/sommelier'
import {
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_STEP,
  FLAVOR_TAG_LABELS,
  INTENSITY_MAX,
  INTENSITY_MIN,
  TASTE_CHOICES,
  createEmptySommelierDraft,
  validateSommelierInput,
} from '../utils/sommelierInput'
import {
  BETWEEN_MESSAGES_MS,
  CONVERSATION_STEPS,
  LONG_WAIT_MS,
  LONG_WAIT_TEXT,
  QUESTION_TO_INPUT_MS,
  SOMMELIER_ARRIVAL_MS,
  SOMMELIER_ARRIVAL_TEXT,
  SOMMELIER_GREETING,
  SOMMELIER_QUESTIONS,
  USER_TO_THINKING_MS,
  composeClosingMessage,
  describeBudgetAnswer,
  describeFreeTextAnswer,
  describeIntensityAnswer,
  describeTasteAnswer,
  formatAmount,
  formatPrice,
  getThinkingCue,
  respondToBudget,
  respondToIntensity,
  respondToTaste,
  type ConversationStep,
  type ThinkingMoment,
} from '../utils/sommelierConversation'

/**
 * opening → answering ⇄ responding → closing → done. `error` replaces
 * `closing` when Step 2 fails; `responding` covers every Sommelier turn.
 */
type Phase = 'opening' | 'answering' | 'responding' | 'closing' | 'error' | 'done'

interface SommelierMessage {
  id: number
  type: 'sommelier'
  lines: string[]
  /** Set when the message asks one of the four questions. */
  question?: ConversationStep
  /** Questions, the closing summary and errors become the auto-scroll reading position. */
  anchor?: boolean
  tone?: 'error'
  details?: string[]
}

interface UserMessage {
  id: number
  type: 'user'
  step: ConversationStep
  lines: string[]
}

interface ThinkingMessage {
  id: number
  type: 'thinking'
  text: string
}

interface SystemMessage {
  id: number
  type: 'system'
  content: 'profile'
}

type ChatMessage = SommelierMessage | UserMessage | ThinkingMessage | SystemMessage
type NewMessage = ChatMessage extends infer T ? (T extends ChatMessage ? Omit<T, 'id'> : never) : never
type Author = 'sommelier' | 'user'

type PreferenceOutcome =
  | { ok: true; preference: Preference }
  | { ok: false; message: string; details: string[] }

const FREE_TEXT_MAX_LENGTH = 1000
const FREE_TEXT_EXAMPLES = [
  '明天休假，要跟幾個兄弟小酌一下，給我來個花香多、濃烈感的。',
  '今晚跟女朋友約會，想喝些清淡舒服一點的，香草、柑橘，不要太烈。',
  '下週要送爸爸當生日禮物，想找口感圓潤、帶點果香和橡木桶味的。',
]
const FREE_TEXT_PLACEHOLDER = ['例如：', ...FREE_TEXT_EXAMPLES.map((example) => `・${example}`)].join('\n')
/** How long the reply input takes to fade out before the user's message appears. */
const REPLY_EXIT_MS = 180
const SCROLL_MARGIN_TOP = 16
const SCROLL_MARGIN_BOTTOM = 24
const PREFERENCE_ERROR_FALLBACK = 'AI 偏好分析暫時無法使用，請稍後再試'
const PREFERENCE_ERROR_INTRO = '抱歉，剛剛整理的時候出了點問題。'

const FIELD_STEPS: Record<SommelierInputField, ConversationStep> = {
  taste: 1,
  intensity: 2,
  budget: 3,
  freeText: 4,
}

const INTENSITY_SLIDERS = [
  { key: 'peaty', label: '泥煤' },
  { key: 'smoky', label: '煙燻' },
] as const

const draft = ref<SommelierInputDraft>(createEmptySommelierDraft())
const messages = ref<ChatMessage[]>([])
const phase = ref<Phase>('opening')
/** True while the Sommelier is "on the way", before the first message. */
const arriving = ref(true)
const activeStep = ref<ConversationStep>(1)
const errors = ref<SommelierInputErrors>({})
const submittedInput = ref<SommelierInput | null>(null)
const preference = ref<Preference | null>(null)
const chatRef = ref<HTMLElement | null>(null)
const headerRef = ref<HTMLElement | null>(null)
const replyRef = ref<HTMLElement | null>(null)
const endRef = ref<HTMLElement | null>(null)
/** Holds the chat height while the reply input is swapped out, so the scroll position never snaps. */
const heldHeight = ref('')

let messageId = 0
/** Bumped on every rewind; an async turn stops as soon as its token is stale. */
let flowToken = 0
let timers: ReturnType<typeof setTimeout>[] = []
let focusReplyOnEnter = false

const progressStep = computed(() =>
  phase.value === 'closing' || phase.value === 'error' || phase.value === 'done'
    ? CONVERSATION_STEPS
    : activeStep.value,
)
const progressLabel = computed(
  () => `${padStep(progressStep.value)} / ${padStep(CONVERSATION_STEPS)}`,
)
const progressWidth = computed(() => `${(progressStep.value / CONVERSATION_STEPS) * 100}%`)
const canContinueTaste = computed(() => draft.value.taste.length > 0)
const canModify = computed(() => phase.value !== 'opening' && phase.value !== 'responding')
const replyVisible = computed(() => phase.value !== 'opening' && phase.value !== 'responding')
const replyKey = computed(() =>
  phase.value === 'answering' ? `step-${activeStep.value}` : phase.value,
)
const replyLabel = computed(() =>
  phase.value === 'answering' ? `回覆：${SOMMELIER_QUESTIONS[activeStep.value].title}` : '下一步',
)

onMounted(() => {
  void openConversation()
})

onBeforeUnmount(() => {
  flowToken++
  clearTimers()
})

function padStep(value: number): string {
  return String(value).padStart(2, '0')
}

function fillPercent(value: number, min: number, max: number): string {
  return `${((value - min) / (max - min)) * 100}%`
}

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
 * latest anchor (the user's message, the current question, …) under the
 * sticky header. Scrolls up only when that anchor is already out of view.
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
  const minTop = (headerRef.value?.offsetHeight ?? 0) + SCROLL_MARGIN_TOP

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
    replyRef.value?.focus({ preventScroll: true })
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
 * the cue duration, or until `work` settles if that takes longer.
 */
async function thinkWhile<T>(
  moment: ThinkingMoment,
  token: number,
  work: Promise<T>,
): Promise<{ id: number; result: T } | null> {
  await wait(USER_TO_THINKING_MS)
  if (token !== flowToken) {
    return null
  }

  const cue = getThinkingCue(moment)
  const id = addMessage({ type: 'thinking', text: cue.text })
  const longWait = setTimeout(() => setThinkingText(id, LONG_WAIT_TEXT), LONG_WAIT_MS)
  timers.push(longWait)
  const [result] = await Promise.all([work, wait(cue.durationMs)])
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

async function askQuestion(step: ConversationStep, token: number, focus = true) {
  await wait(BETWEEN_MESSAGES_MS)
  if (token !== flowToken) {
    return
  }
  activeStep.value = step
  addMessage({ type: 'sommelier', lines: [], question: step, anchor: true })
  await showReply('answering', token, focus)
}

async function openConversation() {
  const token = flowToken
  await wait(SOMMELIER_ARRIVAL_MS)
  if (token !== flowToken) {
    return
  }
  arriving.value = false
  const thought = await thinkWhile('opening', token, Promise.resolve())
  if (!thought) {
    return
  }
  replaceMessage(thought.id, { type: 'sommelier', lines: [SOMMELIER_GREETING] })
  await askQuestion(1, token, false)
}

/** User message → thinking → Sommelier response → next question. */
async function sendAnswer(
  step: ConversationStep,
  answerLines: string[],
  responseLines: string[],
  next: ConversationStep,
) {
  const token = await beginTurn()
  if (token === null) {
    return
  }
  addMessage({ type: 'user', step, lines: answerLines })
  const thought = await thinkWhile(step, token, Promise.resolve())
  if (!thought) {
    return
  }
  replaceMessage(thought.id, { type: 'sommelier', lines: responseLines })
  await askQuestion(next, token)
}

function onAnswerTaste() {
  if (phase.value !== 'answering') {
    return
  }
  if (!canContinueTaste.value) {
    errors.value = { taste: '請至少選擇一種風味' }
    return
  }
  errors.value = {}
  const taste = TASTE_CHOICES.filter((tag) => draft.value.taste.includes(tag))
  void sendAnswer(1, describeTasteAnswer(taste), respondToTaste(taste), 2)
}

function onAnswerIntensity() {
  if (phase.value !== 'answering') {
    return
  }
  const { peaty, smoky } = draft.value
  void sendAnswer(2, describeIntensityAnswer(peaty, smoky), respondToIntensity(peaty, smoky), 3)
}

function onAnswerBudget() {
  if (phase.value !== 'answering') {
    return
  }
  const { budget } = draft.value
  void sendAnswer(3, describeBudgetAnswer(budget), respondToBudget(budget), 4)
}

function onContinue() {
  if (activeStep.value === 1) {
    onAnswerTaste()
  } else if (activeStep.value === 2) {
    onAnswerIntensity()
  } else {
    onAnswerBudget()
  }
}

async function onAnswerFreeText(includeFreeText: boolean) {
  if (phase.value !== 'answering') {
    return
  }
  const result = validateSommelierInput(
    includeFreeText ? draft.value : { ...draft.value, freeText: '' },
  )
  if (!result.ok) {
    errors.value = result.errors
    const fields = Object.keys(result.errors) as SommelierInputField[]
    rewindTo(Math.min(...fields.map((field) => FIELD_STEPS[field])) as ConversationStep, false)
    return
  }

  errors.value = {}
  const input = result.value
  const token = await beginTurn()
  if (token === null) {
    return
  }
  addMessage({ type: 'user', step: 4, lines: describeFreeTextAnswer(input.freeText) })
  submittedInput.value = input
  await deliverPreference(4, input, token)
}

async function requestPreference(input: SommelierInput): Promise<PreferenceOutcome> {
  try {
    return { ok: true, preference: await fetchPreference(input) }
  } catch (error) {
    if (error instanceof SommelierApiError) {
      return { ok: false, message: error.message, details: error.details }
    }
    return { ok: false, message: PREFERENCE_ERROR_FALLBACK, details: [] }
  }
}

/** Calls Step 2 while the Sommelier is thinking, then closes with a summary or an error. */
async function deliverPreference(moment: ThinkingMoment, input: SommelierInput, token: number) {
  const thought = await thinkWhile(moment, token, requestPreference(input))
  if (!thought) {
    return
  }

  const outcome = thought.result
  if (outcome.ok) {
    preference.value = outcome.preference
    replaceMessage(thought.id, {
      type: 'sommelier',
      lines: composeClosingMessage(outcome.preference),
      anchor: true,
    })
    await showReply('closing', token)
  } else {
    replaceMessage(thought.id, {
      type: 'sommelier',
      lines: [PREFERENCE_ERROR_INTRO, outcome.message],
      details: outcome.details,
      tone: 'error',
      anchor: true,
    })
    await showReply('error', token)
  }
}

async function onRetry() {
  const input = submittedInput.value
  if (phase.value !== 'error' || !input) {
    return
  }
  const token = await beginTurn()
  if (token !== null) {
    await deliverPreference('retry', input, token)
  }
}

async function onShowProfile() {
  if (phase.value !== 'closing') {
    return
  }
  const token = await beginTurn()
  if (token === null) {
    return
  }
  const thought = await thinkWhile('profile', token, Promise.resolve())
  if (!thought) {
    return
  }
  replaceMessage(thought.id, { type: 'system', content: 'profile' })
  await showReply('done', token, false)
}

/** Returns to an earlier question, keeping every answer in the draft. */
function rewindTo(step: ConversationStep, clearErrors = true) {
  const index = messages.value.findIndex(
    (message) => message.type === 'sommelier' && message.question === step,
  )
  if (index === -1) {
    return
  }

  flowToken++
  clearTimers()
  heldHeight.value = ''
  submittedInput.value = null
  preference.value = null
  if (clearErrors) {
    errors.value = {}
  }

  messages.value = messages.value.slice(0, index + 1)
  activeStep.value = step
  focusReplyOnEnter = true
  phase.value = 'answering'
  void revealLatest()
}

function toggleTaste(tag: FlavorTag) {
  const taste = draft.value.taste
  draft.value.taste = taste.includes(tag) ? taste.filter((item) => item !== tag) : [...taste, tag]
  if (errors.value.taste && draft.value.taste.length > 0) {
    errors.value = {}
  }
}
</script>

<template>
  <main class="sommelier-view">
    <section class="discovery-hero" aria-labelledby="sommelier-title">
      <div class="discovery-hero-glow" aria-hidden="true" />
      <div class="discovery-hero-inner">
        <header class="page-header">
          <p class="eyebrow"><span class="eyebrow-mark" /> WHISKYHELLO · AI SOMMELIER</p>
          <h1 id="sommelier-title">今天喝什麼？</h1>
          <p class="lead">和 Sommelier 聊幾句，整理出這一次想喝的方向。</p>
        </header>
      </div>
    </section>

    <div class="luxury-rule" aria-hidden="true" />

    <section
      ref="chatRef"
      class="chat"
      aria-label="與 AI Sommelier 的對話"
      :style="{ minHeight: heldHeight || undefined, '--reply-exit': `${REPLY_EXIT_MS}ms` }"
    >
      <header ref="headerRef" class="chat-header">
        <div class="chat-header-row">
          <span class="chat-title">AI Sommelier</span>
          <span class="chat-progress" :aria-label="`第 ${progressStep} 題，共 ${CONVERSATION_STEPS} 題`">
            {{ progressLabel }}
          </span>
        </div>
        <div class="progress-line" aria-hidden="true">
          <span :style="{ width: progressWidth }" />
        </div>
      </header>

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
                v-if="canModify"
                type="button"
                class="modify-link"
                :aria-label="`修改第 ${message.step} 題的回答`"
                @click="rewindTo(message.step)"
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
            <template v-if="isGroupStart(index)">
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
                <span v-if="message.text">{{ message.text }}</span>
                <span class="thinking-dots" aria-hidden="true"><i /><i /><i /></span>
                <span v-if="!message.text" class="sr-only">思考中</span>
              </p>
              <div v-else-if="message.type === 'system'" key="system" class="msg-body is-wide">
                <SommelierPreferenceProfile v-if="preference" :preference="preference" />
              </div>
              <div
                v-else
                key="sommelier"
                class="msg-body"
                :class="{ 'is-error': message.tone === 'error' }"
              >
                <template v-if="message.question">
                  <p class="question">{{ SOMMELIER_QUESTIONS[message.question].title }}</p>
                  <p v-if="SOMMELIER_QUESTIONS[message.question].hint" class="question-hint">
                    {{ SOMMELIER_QUESTIONS[message.question].hint }}
                  </p>
                </template>
                <p v-for="(line, lineIndex) in message.lines" :key="lineIndex" class="msg-line">
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
          :key="replyKey"
          ref="replyRef"
          class="reply"
          :class="{ 'is-plain': phase !== 'answering' }"
          role="group"
          tabindex="-1"
          :aria-label="replyLabel"
        >
          <template v-if="phase === 'answering'">
            <div v-if="activeStep === 1">
              <div
                class="chip-list"
                role="group"
                aria-label="想喝到的風味"
                :aria-describedby="errors.taste ? 'taste-error' : undefined"
              >
                <button
                  v-for="tag in TASTE_CHOICES"
                  :key="tag"
                  type="button"
                  class="chip"
                  :class="{ 'is-selected': draft.taste.includes(tag) }"
                  :aria-pressed="draft.taste.includes(tag)"
                  @click="toggleTaste(tag)"
                >
                  {{ FLAVOR_TAG_LABELS[tag] }}
                </button>
              </div>
              <p v-if="errors.taste" id="taste-error" class="field-error" role="alert">
                {{ errors.taste }}
              </p>
            </div>

            <div v-else-if="activeStep === 2" class="slider-stack">
              <div v-for="slider in INTENSITY_SLIDERS" :key="slider.key">
                <div class="slider-head">
                  <label :for="`intensity-${slider.key}`" class="slider-label">{{ slider.label }}</label>
                  <output :for="`intensity-${slider.key}`" class="slider-value">
                    {{ draft[slider.key] }}
                  </output>
                </div>
                <input
                  :id="`intensity-${slider.key}`"
                  v-model.number="draft[slider.key]"
                  class="range"
                  type="range"
                  :min="INTENSITY_MIN"
                  :max="INTENSITY_MAX"
                  step="1"
                  :style="{ '--fill': fillPercent(draft[slider.key], INTENSITY_MIN, INTENSITY_MAX) }"
                />
                <div class="slider-hints" aria-hidden="true">
                  <span>幾乎沒有</span>
                  <span>濃郁</span>
                </div>
              </div>
              <p v-if="errors.intensity" class="field-error" role="alert">{{ errors.intensity }}</p>
            </div>

            <div v-else-if="activeStep === 3">
              <label for="budget" class="budget-display">
                <span class="budget-currency">NT$</span>
                <span class="budget-amount">{{ formatAmount(draft.budget) }}</span>
              </label>
              <input
                id="budget"
                v-model.number="draft.budget"
                class="range"
                type="range"
                :min="BUDGET_MIN"
                :max="BUDGET_MAX"
                :step="BUDGET_STEP"
                :aria-valuetext="formatPrice(draft.budget)"
                :style="{ '--fill': fillPercent(draft.budget, BUDGET_MIN, BUDGET_MAX) }"
              />
              <div class="slider-hints" aria-hidden="true">
                <span>{{ formatPrice(BUDGET_MIN) }}</span>
                <span>{{ formatPrice(BUDGET_MAX) }}</span>
              </div>
              <p v-if="errors.budget" class="field-error" role="alert">{{ errors.budget }}</p>
            </div>

            <div v-else>
              <Textarea
                id="free-text"
                v-model="draft.freeText"
                rows="4"
                auto-resize
                :maxlength="FREE_TEXT_MAX_LENGTH"
                aria-label="補充說明"
                :placeholder="FREE_TEXT_PLACEHOLDER"
                :invalid="Boolean(errors.freeText)"
                :aria-describedby="errors.freeText ? 'free-text-error' : undefined"
                class="free-text"
              />
              <p v-if="errors.freeText" id="free-text-error" class="field-error" role="alert">
                {{ errors.freeText }}
              </p>
            </div>

            <div class="reply-actions">
              <template v-if="activeStep === 4">
                <Button
                  type="button"
                  label="跳過"
                  severity="secondary"
                  text
                  class="quiet-btn"
                  @click="onAnswerFreeText(false)"
                />
                <Button
                  type="button"
                  label="完成"
                  icon="pi pi-arrow-up"
                  icon-pos="right"
                  class="primary-btn"
                  @click="onAnswerFreeText(true)"
                />
              </template>
              <Button
                v-else
                type="button"
                label="繼續"
                icon="pi pi-arrow-right"
                icon-pos="right"
                class="primary-btn"
                :disabled="activeStep === 1 && !canContinueTaste"
                @click="onContinue"
              />
            </div>
          </template>

          <div v-else-if="phase === 'closing'" class="reply-actions">
            <Button
              type="button"
              label="查看偏好輪廓"
              icon="pi pi-arrow-right"
              icon-pos="right"
              class="primary-btn"
              @click="onShowProfile"
            />
          </div>

          <div v-else-if="phase === 'error'" class="reply-actions">
            <Button
              type="button"
              label="修改需求"
              severity="secondary"
              text
              class="quiet-btn"
              @click="rewindTo(4)"
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

          <div v-else class="reply-actions">
            <Button
              type="button"
              label="修改需求"
              icon="pi pi-pencil"
              severity="secondary"
              text
              class="quiet-btn"
              @click="rewindTo(4)"
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

.chat-header {
  position: sticky;
  top: 0;
  z-index: 2;
  padding-top: 1.25rem;
  background: rgba(250, 250, 249, 0.94);
  backdrop-filter: blur(8px);
}

.chat-header-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.chat-title,
.chat-progress {
  font-size: var(--fs-eyebrow);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.chat-title {
  color: var(--wh-ink-soft);
}

.chat-progress {
  color: var(--wh-faint);
  font-variant-numeric: tabular-nums;
}

.progress-line {
  height: 1px;
  margin-top: 0.75rem;
  background: var(--wh-line);
}

.progress-line span {
  display: block;
  height: 100%;
  background: var(--wh-gold);
  transition: width 400ms ease;
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
  padding: 2rem 0 0;
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

.question {
  margin: 0;
  color: var(--wh-ink);
  font-family: var(--font-display);
  font-size: 1.1875rem;
  font-weight: 600;
  line-height: 1.6;
  text-wrap: pretty;
}

.question-hint {
  margin: 0.2rem 0 0;
  color: var(--wh-muted);
  font-size: 0.9rem;
  line-height: 1.7;
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

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  min-height: 2.5rem;
  padding: 0 1rem;
  border: 1px solid #e2d9cc;
  border-radius: 999px;
  background: var(--wh-paper);
  color: var(--wh-ink-soft);
  font: inherit;
  font-size: 0.925rem;
  line-height: 1.3;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease;
}

.chip:hover {
  border-color: var(--wh-gold);
}

.chip:focus-visible {
  outline: 2px solid var(--wh-amber);
  outline-offset: 2px;
}

.chip.is-selected {
  border-color: #b77932;
  background: #f6e7c8;
  color: #6f381c;
}

.slider-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.slider-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.slider-label {
  color: var(--wh-ink-soft);
  font-size: 0.9rem;
  font-weight: 600;
}

.slider-value {
  min-width: 3ch;
  color: var(--wh-ink);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.range {
  --fill: 0%;
  display: block;
  width: 100%;
  height: 2.5rem;
  margin: 0;
  background: transparent;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}

.range:focus-visible {
  outline: none;
}

.range::-webkit-slider-runnable-track {
  height: 2px;
  border-radius: 2px;
  background:
    linear-gradient(var(--wh-amber), var(--wh-amber)) 0 / var(--fill) 100% no-repeat,
    #e2dacd;
}

.range::-webkit-slider-thumb {
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  margin-top: -10px;
  border: 1.5px solid var(--wh-ink);
  border-radius: 50%;
  background: var(--wh-paper);
  box-shadow: 0 1px 3px rgba(28, 25, 23, 0.14);
  transition: box-shadow 150ms ease;
  -webkit-appearance: none;
}

.range:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 5px rgba(201, 164, 106, 0.35);
}

.range::-moz-range-track {
  height: 2px;
  border-radius: 2px;
  background: #e2dacd;
}

.range::-moz-range-progress {
  height: 2px;
  border-radius: 2px;
  background: var(--wh-amber);
}

.range::-moz-range-thumb {
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  border: 1.5px solid var(--wh-ink);
  border-radius: 50%;
  background: var(--wh-paper);
  box-shadow: 0 1px 3px rgba(28, 25, 23, 0.14);
}

.range:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 5px rgba(201, 164, 106, 0.35);
}

.slider-hints {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: var(--wh-faint);
  font-size: 0.75rem;
}

.budget-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  color: var(--wh-ink);
}

.budget-currency {
  color: var(--wh-muted);
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.budget-amount {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}

.free-text.p-textarea {
  width: 100%;
  min-height: 5.5rem;
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  font-size: 0.975rem;
  line-height: 1.7;
}

.free-text.p-textarea:enabled:focus {
  border: none;
  box-shadow: none;
}

.field-error {
  margin: 0.75rem 0 0;
  color: #b91c1c;
  font-size: 0.84rem;
}

.quiet-btn {
  color: var(--wh-muted) !important;
}

.primary-btn {
  min-width: 7.5rem;
  min-height: 2.75rem;
  border: 1px solid var(--wh-ink) !important;
  background: var(--wh-ink) !important;
  color: var(--wh-paper) !important;
  font-weight: 600 !important;
  letter-spacing: 0.04em;
}

.primary-btn:not(:disabled):hover {
  border-color: #292524 !important;
  background: #292524 !important;
}

.primary-btn:disabled {
  border-color: #d6d0c6 !important;
  background: #e7e2d9 !important;
  color: var(--wh-muted) !important;
  opacity: 1;
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

  .chat-header {
    padding-top: 0.875rem;
  }

  .transcript {
    padding-top: 1.5rem;
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

  .chip {
    min-height: 2.75rem;
  }

  .range {
    height: 2.75rem;
  }

  .range::-webkit-slider-thumb {
    width: 26px;
    height: 26px;
    margin-top: -12px;
  }

  .range::-moz-range-thumb {
    width: 26px;
    height: 26px;
  }

  .reply-actions .primary-btn {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chip,
  .progress-line span,
  .modify-link,
  .reply,
  .range::-webkit-slider-thumb {
    transition: none;
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
