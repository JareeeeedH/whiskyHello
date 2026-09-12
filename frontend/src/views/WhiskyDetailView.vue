<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Slider from 'primevue/slider'
import Textarea from 'primevue/textarea'
import { getWhiskyById } from '../services/whiskyService'
import {
  createReview,
  deleteReview,
  fetchReviewsByWhiskyId,
  ReviewApiError,
  updateReview,
} from '../services/reviewService'
import { useAuthStore } from '../stores/auth'
import type { PublicReview } from '../types/review'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const whisky = computed(() => {
  const id = String(route.params.id ?? '')
  if (!id) {
    return undefined
  }
  return getWhiskyById(id)
})

const whiskyId = computed(() => whisky.value?.id ?? '')

const reviews = ref<PublicReview[]>([])
const listLoading = ref(false)
const listError = ref('')

const modalVisible = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingReviewId = ref<string | null>(null)
const submitting = ref(false)
const formError = ref('')
const actionError = ref('')

const formTitle = ref('')
const formContent = ref('')
const formRating = ref(80)
const formNose = ref('')
const formTaste = ref('')
const formFinish = ref('')

const currentUserId = computed(() => authStore.user?.id ?? null)
const isAuthenticated = computed(() => authStore.isAuthenticated)

const modalWhiskyName = computed(
  () => whisky.value?.name?.trim() || '這支威士忌',
)

const ratingHint = computed(() => {
  const score = formRating.value
  if (score >= 90) return '極致推薦'
  if (score >= 80) return '很棒，值得推薦'
  if (score >= 70) return '不錯，值得一試'
  if (score >= 60) return '中規中矩'
  return '尚有進步空間'
})

const submitLabel = computed(() =>
  modalMode.value === 'edit' ? '儲存修改' : '發布評論',
)

const submittingLabel = computed(() =>
  modalMode.value === 'edit' ? '儲存中…' : '發布中…',
)

function isOwnReview(review: PublicReview): boolean {
  return Boolean(currentUserId.value && review.userId === currentUserId.value)
}

function formatRelativeTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const diffMs = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) return '剛剛'
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} 分鐘前`
  if (diffMs < day) return `${Math.floor(diffMs / hour)} 小時前`
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} 天前`

  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatAbsoluteTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function resetForm() {
  formTitle.value = ''
  formContent.value = ''
  formRating.value = 80
  formNose.value = ''
  formTaste.value = ''
  formFinish.value = ''
  formError.value = ''
  editingReviewId.value = null
}

async function loadReviews() {
  if (!whiskyId.value) {
    reviews.value = []
    return
  }

  listLoading.value = true
  listError.value = ''
  actionError.value = ''

  try {
    reviews.value = await fetchReviewsByWhiskyId(whiskyId.value)
  } catch (error) {
    reviews.value = []
    listError.value =
      error instanceof ReviewApiError
        ? error.message
        : '無法載入評論，請稍後再試'
  } finally {
    listLoading.value = false
  }
}

function openCreateModal() {
  if (!isAuthenticated.value) {
    void router.push({
      name: 'login',
      query: { redirect: route.fullPath },
    })
    return
  }

  modalMode.value = 'create'
  resetForm()
  modalVisible.value = true
}

function openEditModal(review: PublicReview) {
  if (!isOwnReview(review)) {
    return
  }

  modalMode.value = 'edit'
  editingReviewId.value = review.id
  formTitle.value = review.title
  formContent.value = review.content
  formRating.value = review.rating
  formNose.value = review.nose
  formTaste.value = review.taste
  formFinish.value = review.finish
  formError.value = ''
  modalVisible.value = true
}

function closeModal() {
  if (submitting.value) {
    return
  }
  modalVisible.value = false
  resetForm()
}

function validateForm(): string | null {
  if (
    Number.isNaN(formRating.value) ||
    formRating.value < 0 ||
    formRating.value > 100
  ) {
    return '整體評分需介於 0 到 100'
  }
  if (!formTitle.value.trim()) {
    return '請輸入評論標題'
  }
  if (!formContent.value.trim()) {
    return '請寫下評論內容'
  }
  return null
}

async function submitReview() {
  if (submitting.value || !whiskyId.value) {
    return
  }

  formError.value = ''
  const clientError = validateForm()
  if (clientError) {
    formError.value = clientError
    return
  }

  submitting.value = true

  try {
    const payload = {
      title: formTitle.value.trim(),
      content: formContent.value.trim(),
      rating: Math.round(formRating.value),
      nose: formNose.value.trim(),
      taste: formTaste.value.trim(),
      finish: formFinish.value.trim(),
    }

    if (modalMode.value === 'create') {
      const created = await createReview({
        whiskyId: whiskyId.value,
        ...payload,
      })
      reviews.value = [created, ...reviews.value.filter((item) => item.id !== created.id)]
    } else if (editingReviewId.value) {
      const updated = await updateReview(editingReviewId.value, payload)
      reviews.value = reviews.value.map((item) =>
        item.id === updated.id ? updated : item,
      )
    }

    modalVisible.value = false
    resetForm()
  } catch (error) {
    if (error instanceof ReviewApiError) {
      if (error.status === 400 && error.details.length > 0) {
        formError.value = error.details.join('；')
      } else if (error.status === 401) {
        formError.value = '登入已失效，請重新登入後再試'
      } else {
        formError.value = error.message
      }
    } else {
      formError.value = '儲存失敗，請稍後再試'
    }
  } finally {
    submitting.value = false
  }
}

async function onDeleteReview(review: PublicReview) {
  if (!isOwnReview(review) || submitting.value) {
    return
  }

  const confirmed = window.confirm('確定要刪除這則評論嗎？')
  if (!confirmed) {
    return
  }

  actionError.value = ''
  submitting.value = true

  try {
    await deleteReview(review.id)
    reviews.value = reviews.value.filter((item) => item.id !== review.id)
  } catch (error) {
    actionError.value =
      error instanceof ReviewApiError
        ? error.message
        : '刪除失敗，請稍後再試'
  } finally {
    submitting.value = false
  }
}

watch(
  whiskyId,
  (id) => {
    if (id) {
      void loadReviews()
    } else {
      reviews.value = []
    }
  },
  { immediate: true },
)
</script>

<template>
  <main class="detail">
    <p class="back">
      <RouterLink to="/whiskies">← 返回搜尋</RouterLink>
    </p>

    <template v-if="whisky">
      <section class="hero">
        <div class="image-wrap">
          <img
            v-if="whisky.imageUrl"
            :src="whisky.imageUrl"
            :alt="whisky.name"
            class="image"
          />
          <div v-else class="image-fallback">No image</div>
        </div>

        <div class="summary">
          <h1>{{ whisky.name }}</h1>
          <p v-if="whisky.subtitle" class="subtitle">{{ whisky.subtitle }}</p>

          <div class="ratings">
            <div v-if="whisky.points !== undefined" class="points-block">
              <span class="points-value">{{ whisky.points }}</span>
              <span class="points-unit">points</span>
            </div>
            <div class="meta-list">
              <p v-if="whisky.sgp"><span class="meta-label">SGP</span> {{ whisky.sgp }}</p>
              <p v-if="whisky.score"><span class="meta-label">Score</span> {{ whisky.score }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="block">
        <h2>知名評論家評論</h2>
        <div v-if="whisky.note" class="note">{{ whisky.note }}</div>
        <p v-else class="empty">目前沒有知名評論家評論。</p>
      </section>

      <section class="block friend-reviews">
        <div class="section-head">
          <h2>酒友評論</h2>
          <Button
            type="button"
            label="我要評論"
            icon="pi pi-pencil"
            class="write-btn"
            @click="openCreateModal"
          />
        </div>

        <p v-if="listLoading" class="state">載入評論中…</p>
        <p v-else-if="listError" class="state is-error" role="alert">{{ listError }}</p>
        <template v-else>
          <p v-if="actionError" class="state is-error" role="alert">{{ actionError }}</p>
          <p v-if="reviews.length === 0" class="empty">
            尚無品飲評論，歡迎留下你的感受。
          </p>
          <ul v-else class="review-list">
            <li v-for="review in reviews" :key="review.id" class="review-card">
              <div class="review-main">
                <div
                  class="review-score"
                  :aria-label="`評分 ${review.rating} 分`"
                >
                  <span class="score-value">{{ review.rating }}</span>
                  <span class="score-max">/100</span>
                </div>

                <div class="review-body">
                  <div class="review-heading">
                    <p class="review-title">{{ review.title }}</p>
                    <div v-if="isOwnReview(review)" class="review-actions">
                      <button
                        type="button"
                        class="action-btn"
                        :disabled="submitting"
                        @click="openEditModal(review)"
                      >
                        編輯
                      </button>
                      <button
                        type="button"
                        class="action-btn action-delete"
                        :disabled="submitting"
                        @click="onDeleteReview(review)"
                      >
                        刪除
                      </button>
                    </div>
                  </div>

                  <p class="review-meta">
                    <span>{{ review.authorName || '酒友' }}</span>
                    <span class="dot">·</span>
                    <time :datetime="review.createdAt" :title="formatAbsoluteTime(review.createdAt)">
                      {{ formatRelativeTime(review.createdAt) }}
                    </time>
                  </p>

                  <p class="review-content">{{ review.content }}</p>

                  <div
                    v-if="review.nose || review.taste || review.finish"
                    class="tasting-chips"
                  >
                    <span v-if="review.nose" class="chip">香氣 · {{ review.nose }}</span>
                    <span v-if="review.taste" class="chip">口感 · {{ review.taste }}</span>
                    <span v-if="review.finish" class="chip">尾韻 · {{ review.finish }}</span>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </template>
      </section>
    </template>

    <section v-else class="not-found">
      <h1>Whisky not found</h1>
      <p>找不到這款威士忌，請返回搜尋再試一次。</p>
      <RouterLink to="/whiskies">← 返回搜尋</RouterLink>
    </section>

    <Dialog
      v-model:visible="modalVisible"
      modal
      :draggable="false"
      class="review-dialog"
      :style="{ width: 'min(94vw, 540px)' }"
      :content-style="{
        padding: '0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'min(82vh, 680px)',
      }"
      :closable="!submitting"
      :dismissable-mask="!submitting"
      @hide="closeModal"
    >
      <template #header>
        <div class="dialog-header">
          <p class="dialog-whisky">{{ modalWhiskyName }}</p>
        </div>
      </template>

      <form id="review-form" class="review-form" @submit.prevent="submitReview">
        <div class="form-scroll">
          <section class="form-section rating-section" aria-labelledby="rating-label">
            <p id="rating-label" class="section-label">整體評分</p>
            <div class="rating-display" aria-live="polite">
              <span class="rating-score">{{ formRating }}</span>
              <span class="rating-max">/ 100</span>
            </div>
            <Slider
              v-model="formRating"
              class="rating-slider"
              :min="0"
              :max="100"
              :step="1"
              :disabled="submitting"
            />
            <p class="rating-hint">{{ ratingHint }}</p>
          </section>

          <section class="form-section">
            <label class="field-label" for="review-title">評論標題</label>
            <InputText
              id="review-title"
              v-model="formTitle"
              class="field"
              maxlength="120"
              :disabled="submitting"
            />
          </section>

          <section class="form-section">
            <label class="field-label" for="review-content">評論內容分享</label>
            <Textarea
              id="review-content"
              v-model="formContent"
              class="field content-field"
              rows="5"
              auto-resize
              maxlength="5000"
              :disabled="submitting"
            />
          </section>

          <section class="form-section tasting-section">
            <label class="field-label soft" for="review-nose">香氣（選填）</label>
            <InputText
              id="review-nose"
              v-model="formNose"
              class="field soft-field"
              maxlength="1000"
              placeholder="例如：蜂蜜、香草、柑橘、泥煤……"
              :disabled="submitting"
            />

            <label class="field-label soft" for="review-taste">口感（選填）</label>
            <InputText
              id="review-taste"
              v-model="formTaste"
              class="field soft-field"
              maxlength="1000"
              placeholder="例如：甜感、木質、辛香、果乾……"
              :disabled="submitting"
            />

            <label class="field-label soft" for="review-finish">尾韻（選填）</label>
            <InputText
              id="review-finish"
              v-model="formFinish"
              class="field soft-field"
              maxlength="1000"
              placeholder="例如：悠長、溫暖、辛辣、乾爽……"
              :disabled="submitting"
            />
          </section>

          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
        </div>
      </form>

      <template #footer>
        <div class="dialog-footer">
          <Button
            type="button"
            label="取消"
            severity="secondary"
            text
            :disabled="submitting"
            @click="closeModal"
          />
          <Button
            type="submit"
            form="review-form"
            :label="submitting ? submittingLabel : submitLabel"
            :loading="submitting"
            class="submit-btn"
          />
        </div>
      </template>
    </Dialog>
  </main>
</template>

<style scoped>
.detail {
  max-width: 880px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem 2.5rem;
}

.back {
  margin: 0 0 1.25rem;
}

.back a,
.not-found a {
  color: #0f766e;
  text-decoration: none;
}

.hero {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1.5rem;
  align-items: start;
  margin-bottom: 1.75rem;
}

.image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 260px;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-fallback {
  color: #94a3b8;
  font-size: 0.875rem;
}

.summary h1 {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  line-height: 1.25;
  color: #0f172a;
}

.subtitle {
  margin: 0 0 1rem;
  color: #64748b;
  line-height: 1.5;
}

.ratings {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  align-items: flex-end;
}

.points-block {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.points-value {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
  color: #0f766e;
}

.points-unit {
  font-size: 0.875rem;
  font-weight: 600;
  color: #0f766e;
}

.meta-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.meta-list p {
  margin: 0;
  color: #334155;
  line-height: 1.4;
}

.meta-label {
  display: inline-block;
  min-width: 3.25rem;
  margin-right: 0.35rem;
  font-weight: 600;
  color: #475569;
}

.block {
  margin-bottom: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e2e8f0;
}

.block h2 {
  margin: 0 0 0.75rem;
  font-size: 1.125rem;
  color: #0f172a;
}

.section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.section-head h2 {
  margin: 0;
}

.write-btn {
  border: none !important;
  background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%) !important;
  color: #1c1917 !important;
  font-weight: 700 !important;
}

:deep(.review-dialog.p-dialog) {
  border-radius: 0.85rem;
  overflow: hidden;
}

:deep(.review-dialog .p-dialog-content) {
  display: flex;
  flex-direction: column;
  padding: 0 !important;
}

.note {
  margin: 0;
  color: #334155;
  font-size: 1rem;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.empty,
.state {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.state.is-error {
  color: #b91c1c;
}

.review-list {
  margin: 0.15rem 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}

.review-card {
  padding: 1.05rem 0;
  border-bottom: 1px solid #f0eeeb;
  background: transparent;
}

.review-card:first-child {
  padding-top: 0.35rem;
}

.review-card:last-child {
  border-bottom: none;
  padding-bottom: 0.25rem;
}

.review-main {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.85rem 1rem;
  align-items: start;
}

.review-score {
  display: flex;
  align-items: baseline;
  gap: 0.12rem;
  min-width: 3.4rem;
  padding-top: 0.1rem;
}

.score-value {
  font-size: 1.55rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
  color: #b45309;
}

.score-max {
  font-size: 0.75rem;
  font-weight: 600;
  color: #a8a29e;
}

.review-body {
  min-width: 0;
}

.review-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.review-title {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 700;
  color: #1c1917;
  line-height: 1.35;
}

.review-actions {
  display: flex;
  gap: 0.15rem;
  opacity: 0.55;
  transition: opacity 0.15s ease;
}

.review-card:hover .review-actions,
.review-card:focus-within .review-actions {
  opacity: 1;
}

.action-btn {
  padding: 0.15rem 0.4rem;
  border: none;
  background: none;
  color: #a8a29e;
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}

.action-btn:hover:not(:disabled) {
  color: #57534e;
}

.action-btn.action-delete:hover:not(:disabled) {
  color: #b45309;
}

.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.review-meta {
  margin: 0.28rem 0 0;
  color: #a8a29e;
  font-size: 0.8125rem;
}

.review-meta .dot {
  margin: 0 0.28rem;
}

.review-content {
  margin: 0.55rem 0 0;
  color: #44403c;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.tasting-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.7rem;
}

.chip {
  display: inline-flex;
  max-width: 100%;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  background: #fafaf9;
  border: 1px solid #f0eeeb;
  color: #78716c;
  font-size: 0.78rem;
  line-height: 1.35;
  word-break: break-word;
}

.review-form {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.form-scroll {
  overflow-y: auto;
  padding: 0.2rem 1.35rem 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 1.05rem;
}

.dialog-header {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-right: 0.75rem;
  min-width: 0;
}

.dialog-whisky {
  margin: 0;
  color: #1c1917;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.35;
  word-break: break-word;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.section-label {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #57534e;
}

.section-label.soft,
.field-label.soft {
  color: #a8a29e;
  font-weight: 600;
}

.section-helper {
  margin: 0;
  color: #a8a29e;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.field-label {
  margin: 0;
  color: #44403c;
  font-size: 0.9rem;
  font-weight: 600;
}

.rating-section {
  padding: 0.7rem 0.9rem 0.75rem;
  border: 1px solid #f0eeeb;
  background: linear-gradient(165deg, #fffefb 0%, #fafaf9 100%);
}

.rating-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.3rem;
  margin: 0 0 0.5rem;
}

.rating-score {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
  color: #b45309;
}

.rating-max {
  font-size: 0.9rem;
  font-weight: 600;
  color: #a8a29e;
}

.rating-slider {
  width: 100%;
}

.rating-hint {
  margin: 0.45rem 0 0;
  text-align: center;
  color: #78716c;
  font-size: 0.8125rem;
}

.tasting-section {
  gap: 0.5rem;
  padding-top: 0.15rem;
}

.field,
:deep(.p-inputtext),
:deep(.p-textarea) {
  width: 100%;
}

.content-field :deep(textarea),
:deep(.content-field.p-textarea) {
  min-height: 5.75rem;
  line-height: 1.55;
}

.soft-field :deep(.p-inputtext),
:deep(.soft-field.p-inputtext) {
  background: #fcfcfb !important;
  border-color: #ebe8e4 !important;
}

:deep(.p-dialog-header) {
  padding: 1.15rem 1.35rem 0.85rem !important;
  border-bottom: 1px solid #f5f5f4;
}

:deep(.p-dialog-footer) {
  padding: 0.85rem 1.35rem 1.1rem !important;
  border-top: 1px solid #f5f5f4;
  background: #fff;
}

:deep(.rating-slider.p-slider) {
  background: #e7e5e4;
  height: 0.35rem;
}

:deep(.rating-slider .p-slider-range) {
  background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
}

:deep(.rating-slider .p-slider-handle) {
  width: 1.15rem;
  height: 1.15rem;
  background: #fff;
  border: 2px solid #d97706;
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.25);
}

.form-error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.875rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  width: 100%;
}

.submit-btn {
  border: none !important;
  background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%) !important;
  color: #1c1917 !important;
  font-weight: 700 !important;
}

.not-found h1 {
  margin: 0 0 0.75rem;
}

.not-found p {
  margin: 0 0 1rem;
  color: #64748b;
}

@media (max-width: 720px) {
  .detail {
    padding: 1rem 1rem 2rem;
  }

  .hero {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .image-wrap {
    height: 220px;
  }

  .summary h1 {
    font-size: 1.5rem;
  }

  .points-value {
    font-size: 2.125rem;
  }

  .section-head {
    align-items: stretch;
  }

  .write-btn {
    width: 100%;
  }

  .review-main {
    grid-template-columns: 1fr;
    gap: 0.45rem;
  }

  .review-score {
    min-width: 0;
  }

  .review-actions {
    opacity: 1;
  }

  .form-scroll {
    padding: 0.15rem 1rem 0.85rem;
    gap: 0.95rem;
  }

  .rating-score {
    font-size: 2.05rem;
  }

  .dialog-footer {
    flex-wrap: wrap;
  }

  .dialog-footer :deep(.p-button) {
    flex: 1 1 auto;
  }
}
</style>
