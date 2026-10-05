<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import type {
  SommelierBudget,
  SommelierInput,
  SommelierInputDraft,
  SommelierInputErrors,
} from '../types/sommelier'
import {
  FLAVOR_TAGS,
  FLAVOR_TAG_LABELS,
  OCCASIONS,
  OCCASION_LABELS,
  createEmptySommelierDraft,
  validateSommelierInput,
} from '../utils/sommelierInput'

const draft = ref<SommelierInputDraft>(createEmptySommelierDraft())
const errors = ref<SommelierInputErrors>({})
const hasAttemptedSubmit = ref(false)
const submittedInput = ref<SommelierInput | null>(null)

const hasErrors = computed(() => Object.keys(errors.value).length > 0)

watch(
  draft,
  (value) => {
    if (!hasAttemptedSubmit.value) {
      return
    }
    const result = validateSommelierInput(value)
    errors.value = result.ok ? {} : result.errors
  },
  { deep: true },
)

function onSubmit() {
  hasAttemptedSubmit.value = true
  const result = validateSommelierInput(draft.value)

  if (!result.ok) {
    errors.value = result.errors
    return
  }

  errors.value = {}
  submittedInput.value = result.value
}

function onEdit() {
  submittedInput.value = null
}

function onReset() {
  draft.value = createEmptySommelierDraft()
  errors.value = {}
  hasAttemptedSubmit.value = false
}

function formatAmount(value: number): string {
  return value.toLocaleString('zh-TW')
}

function formatBudget(budget: SommelierBudget): string {
  if (budget.min !== undefined && budget.max !== undefined) {
    return `${formatAmount(budget.min)} – ${formatAmount(budget.max)}`
  }
  if (budget.min !== undefined) {
    return `${formatAmount(budget.min)} 以上`
  }
  return `${formatAmount(budget.max ?? 0)} 以內`
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
          <p class="lead">告訴我們這一次想要的風味、預算與情境，作為挑選酒款的起點。</p>
        </header>
        <p class="step-indicator">
          <strong>STEP 01</strong>
          <span>輸入這次的需求</span>
        </p>
      </div>
    </section>

    <div class="luxury-rule" aria-hidden="true" />

    <div class="sommelier-inner">
      <form
        v-if="!submittedInput"
        class="sommelier-form"
        novalidate
        @submit.prevent="onSubmit"
      >
        <fieldset
          class="form-section"
          :aria-describedby="errors.taste ? 'taste-error' : undefined"
        >
          <legend class="section-title">
            <span class="section-index">01</span>
            想喝到的風味
          </legend>
          <p class="section-hint">可複選，也可以不選。</p>
          <div class="chip-list">
            <label
              v-for="tag in FLAVOR_TAGS"
              :key="tag"
              class="chip is-taste"
              :class="{ 'is-selected': draft.taste.includes(tag) }"
            >
              <input v-model="draft.taste" class="chip-input" type="checkbox" :value="tag" />
              <i class="pi pi-check chip-icon" aria-hidden="true" />
              <span class="chip-label">{{ FLAVOR_TAG_LABELS[tag] }}</span>
              <span class="chip-key" aria-hidden="true">{{ tag }}</span>
            </label>
          </div>
          <p v-if="errors.taste" id="taste-error" class="field-error" role="alert">
            {{ errors.taste }}
          </p>
        </fieldset>

        <fieldset
          class="form-section"
          :aria-describedby="errors.dislikes ? 'dislikes-error' : undefined"
        >
          <legend class="section-title">
            <span class="section-index">02</span>
            不想要的風味
          </legend>
          <p class="section-hint">可複選，也可以不選。</p>
          <div class="chip-list">
            <label
              v-for="tag in FLAVOR_TAGS"
              :key="tag"
              class="chip is-dislike"
              :class="{ 'is-selected': draft.dislikes.includes(tag) }"
            >
              <input v-model="draft.dislikes" class="chip-input" type="checkbox" :value="tag" />
              <i class="pi pi-times chip-icon" aria-hidden="true" />
              <span class="chip-label">{{ FLAVOR_TAG_LABELS[tag] }}</span>
              <span class="chip-key" aria-hidden="true">{{ tag }}</span>
            </label>
          </div>
          <p v-if="errors.dislikes" id="dislikes-error" class="field-error" role="alert">
            {{ errors.dislikes }}
          </p>
        </fieldset>

        <fieldset
          class="form-section"
          :aria-describedby="errors.budget ? 'budget-error' : undefined"
        >
          <legend class="section-title">
            <span class="section-index">03</span>
            預算
            <span class="optional">選填</span>
          </legend>
          <p class="section-hint">可只填其中一個。</p>
          <div class="budget-row">
            <label class="budget-field" for="budget-min">
              <span>最低</span>
              <InputNumber
                v-model="draft.budgetMin"
                input-id="budget-min"
                :min="0"
                placeholder="不限"
                :invalid="Boolean(errors.budget)"
                class="budget-input"
              />
            </label>
            <span class="budget-sep" aria-hidden="true">—</span>
            <label class="budget-field" for="budget-max">
              <span>最高</span>
              <InputNumber
                v-model="draft.budgetMax"
                input-id="budget-max"
                :min="0"
                placeholder="不限"
                :invalid="Boolean(errors.budget)"
                class="budget-input"
              />
            </label>
          </div>
          <p v-if="errors.budget" id="budget-error" class="field-error" role="alert">
            {{ errors.budget }}
          </p>
        </fieldset>

        <fieldset
          class="form-section"
          :aria-describedby="errors.occasion ? 'occasion-error' : undefined"
        >
          <legend class="section-title">
            <span class="section-index">04</span>
            飲酒情境
            <span class="optional">選填</span>
          </legend>
          <p class="section-hint">單選。</p>
          <div class="chip-list">
            <label class="chip is-occasion" :class="{ 'is-selected': draft.occasion === null }">
              <input
                v-model="draft.occasion"
                class="chip-input"
                type="radio"
                name="occasion"
                :value="null"
              />
              <span class="chip-label">不指定</span>
            </label>
            <label
              v-for="occasion in OCCASIONS"
              :key="occasion"
              class="chip is-occasion"
              :class="{ 'is-selected': draft.occasion === occasion }"
            >
              <input
                v-model="draft.occasion"
                class="chip-input"
                type="radio"
                name="occasion"
                :value="occasion"
              />
              <span class="chip-label">{{ OCCASION_LABELS[occasion] }}</span>
            </label>
          </div>
          <p v-if="errors.occasion" id="occasion-error" class="field-error" role="alert">
            {{ errors.occasion }}
          </p>
        </fieldset>

        <div class="form-section">
          <label class="section-title" for="free-text">
            <span class="section-index">05</span>
            補充說明
            <span class="optional">選填</span>
          </label>
          <p class="section-hint">用自己的話描述，例如場合、心情或想避開的感覺。</p>
          <Textarea
            id="free-text"
            v-model="draft.freeText"
            rows="4"
            auto-resize
            placeholder="例如：想找適合晚上慢慢喝、不要太烈的酒"
            :invalid="Boolean(errors.freeText)"
            :aria-describedby="errors.freeText ? 'free-text-error' : undefined"
            class="free-text"
          />
          <p v-if="errors.freeText" id="free-text-error" class="field-error" role="alert">
            {{ errors.freeText }}
          </p>
        </div>

        <div class="form-actions">
          <p v-if="hasErrors" class="form-error" role="alert">請修正上方標示的欄位後再繼續。</p>
          <div class="action-buttons">
            <Button
              type="button"
              label="清除"
              severity="secondary"
              text
              class="reset-btn"
              @click="onReset"
            />
            <Button
              type="submit"
              label="繼續"
              icon="pi pi-arrow-right"
              icon-pos="right"
              class="submit-btn"
            />
          </div>
        </div>
      </form>

      <section v-else class="summary" aria-labelledby="summary-title">
        <p class="summary-eyebrow">STEP 01 · COMPLETE</p>
        <h2 id="summary-title">需求已整理完成</h2>
        <p class="section-hint">以下是這次的需求摘要，下一步將依此分析你的偏好。</p>

        <dl class="summary-list">
          <div>
            <dt>想喝到的風味</dt>
            <dd>
              <span v-if="submittedInput.taste.length === 0" class="muted">未指定</span>
              <span v-for="tag in submittedInput.taste" :key="tag" class="summary-tag is-taste">
                {{ FLAVOR_TAG_LABELS[tag] }}
              </span>
            </dd>
          </div>
          <div>
            <dt>不想要的風味</dt>
            <dd>
              <span v-if="submittedInput.dislikes.length === 0" class="muted">未指定</span>
              <span
                v-for="tag in submittedInput.dislikes"
                :key="tag"
                class="summary-tag is-dislike"
              >
                {{ FLAVOR_TAG_LABELS[tag] }}
              </span>
            </dd>
          </div>
          <div>
            <dt>預算</dt>
            <dd>
              <span v-if="submittedInput.budget">{{ formatBudget(submittedInput.budget) }}</span>
              <span v-else class="muted">未指定</span>
            </dd>
          </div>
          <div>
            <dt>飲酒情境</dt>
            <dd>
              <span v-if="submittedInput.occasion">{{ OCCASION_LABELS[submittedInput.occasion] }}</span>
              <span v-else class="muted">未指定</span>
            </dd>
          </div>
          <div>
            <dt>補充說明</dt>
            <dd>
              <span v-if="submittedInput.freeText" class="free-text-value">{{ submittedInput.freeText }}</span>
              <span v-else class="muted">未填寫</span>
            </dd>
          </div>
        </dl>

        <div class="action-buttons">
          <Button
            type="button"
            label="修改需求"
            icon="pi pi-pencil"
            severity="secondary"
            outlined
            @click="onEdit"
          />
        </div>
      </section>
    </div>

    <footer class="page-footer">
      <p>WhiskyHello · 從一杯酒開始</p>
    </footer>
  </main>
</template>

<style scoped>
.sommelier-view {
  width: 100%;
  overflow-x: clip;
  color: #1c1917;
  background: #fafaf9;
}

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

.step-indicator {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-top: 1.35rem;
  color: #a8a29e;
  font-size: 0.8rem;
}

.step-indicator strong {
  color: #fbbf24;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.16em;
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

.sommelier-inner {
  max-width: 820px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3.5rem;
}

.sommelier-form,
.summary {
  border: 1px solid #e7dfd3;
  background: linear-gradient(150deg, #fffefa, #faf7f1);
  box-shadow: 0 12px 35px rgba(41, 37, 36, 0.045);
}

.form-section {
  min-width: 0;
  margin: 0;
  padding: 1.5rem 1.75rem;
  border: none;
  border-bottom: 1px solid #ece5da;
}

.section-title {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0;
  margin-bottom: 0.2rem;
  color: #292524;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
}

/* Floating the legend opts it out of fieldset legend layout so spacing matches the label-titled section. */
legend.section-title {
  float: left;
  width: 100%;
}

legend.section-title + .section-hint {
  clear: both;
}

.section-index {
  color: #b77932;
  font-family: var(--font-body);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.optional {
  color: #a8a29e;
  font-family: var(--font-body);
  font-size: 0.72rem;
  font-weight: 500;
}

.section-hint {
  margin-bottom: 0.95rem;
  color: #78716c;
  font-size: 0.85rem;
  line-height: 1.6;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.5rem;
  padding: 0.45rem 0.9rem;
  border: 1px solid #ddd6cc;
  border-radius: 999px;
  background: #fff;
  color: #44403c;
  font-size: 0.9rem;
  line-height: 1.3;
  cursor: pointer;
  user-select: none;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease;
}

.chip:hover {
  border-color: #c9a46b;
}

.chip:has(.chip-input:focus-visible) {
  outline: 2px solid #b45309;
  outline-offset: 2px;
}

.chip-input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.chip-icon {
  display: none;
  font-size: 0.7rem;
}

.chip-key {
  color: #a8a29e;
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.chip.is-selected .chip-icon {
  display: inline-block;
}

.chip.is-taste.is-selected,
.chip.is-occasion.is-selected {
  border-color: #b77932;
  background: linear-gradient(135deg, #fdf3df, #f6e2bd);
  color: #6f381c;
}

.chip.is-taste.is-selected .chip-key {
  color: #a16207;
}

.chip.is-dislike.is-selected {
  border-color: #44403c;
  background: #292524;
  color: #fafaf9;
}

.chip.is-dislike.is-selected .chip-key {
  color: #a8a29e;
}

.budget-row {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
}

.budget-field {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
  color: #57534e;
  font-size: 0.8rem;
  font-weight: 600;
}

.budget-input,
.budget-input :deep(.p-inputtext) {
  width: 100%;
}

.budget-input :deep(.p-inputtext) {
  min-height: 2.75rem;
  font-variant-numeric: tabular-nums;
}

.budget-sep {
  padding-bottom: 0.65rem;
  color: #a8a29e;
}

.free-text {
  width: 100%;
  min-height: 6.5rem;
  line-height: 1.65;
}

.field-error {
  margin-top: 0.6rem;
  color: #b91c1c;
  font-size: 0.84rem;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.35rem 1.75rem 1.5rem;
}

.form-error {
  color: #b91c1c;
  font-size: 0.875rem;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.submit-btn {
  min-width: 9rem;
  min-height: 2.75rem;
  border: none !important;
  background: linear-gradient(135deg, #d6a34b, #b77932) !important;
  color: #21180d !important;
  font-weight: 700 !important;
}

.submit-btn:hover {
  filter: brightness(1.04);
}

.reset-btn {
  color: #78716c !important;
}

.summary {
  padding: 1.75rem;
}

.summary-eyebrow {
  margin-bottom: 0.4rem;
  color: #b77932;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.summary h2 {
  margin-bottom: 0.3rem;
  color: #292524;
  font-size: var(--fs-h3);
}

.summary-list {
  margin: 0.5rem 0 1.5rem;
  border-top: 1px solid #ece5da;
}

.summary-list > div {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr);
  gap: 0.75rem;
  padding: 0.9rem 0;
  border-bottom: 1px solid #ece5da;
}

.summary-list dt {
  color: #78716c;
  font-size: 0.82rem;
  font-weight: 600;
}

.summary-list dd {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  color: #292524;
  font-size: 0.92rem;
}

.summary-tag {
  padding: 0.15rem 0.65rem;
  border-radius: 999px;
  font-size: 0.82rem;
}

.summary-tag.is-taste {
  border: 1px solid #e3c48f;
  background: #fdf3df;
  color: #6f381c;
}

.summary-tag.is-dislike {
  background: #292524;
  color: #fafaf9;
}

.free-text-value {
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.muted {
  color: #a8a29e;
}

.page-footer {
  padding: 1.75rem 1.5rem;
  text-align: center;
  background: #292524;
  color: #a8a29e;
}

.page-footer p {
  font-size: 0.875rem;
}

@media (max-width: 640px) {
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

  .step-indicator {
    margin-top: 0.9rem;
  }

  .sommelier-inner {
    padding: 0.9rem 1rem 2.25rem;
  }

  .form-section,
  .form-actions {
    padding-right: 1.1rem;
    padding-left: 1.1rem;
  }

  .chip {
    min-height: 2.75rem;
  }

  .action-buttons {
    flex-direction: column-reverse;
  }

  .action-buttons :deep(.p-button) {
    width: 100%;
  }

  .summary {
    padding: 1.25rem 1.1rem;
  }

  .summary-list > div {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chip {
    transition: none;
  }
}
</style>
