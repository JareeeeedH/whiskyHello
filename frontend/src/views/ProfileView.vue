<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import { useAuthStore } from '../stores/auth'
import {
  fetchMyReviews,
  ReviewApiError,
} from '../services/reviewService'
import { getWhiskyById } from '../services/whiskyService'
import type { PublicReview } from '../types/review'

const authStore = useAuthStore()

const profile = computed(() => authStore.user)

const isEditing = ref(false)
const draftName = ref('')
const draftAvatar = ref('')
const draftBio = ref('')
const editNotice = ref('')

const myReviews = ref<PublicReview[]>([])
const reviewsLoading = ref(false)
const reviewsError = ref('')

const displayName = computed(() => {
  if (isEditing.value) return draftName.value.trim() || profile.value?.name || ''
  return profile.value?.name?.trim() || ''
})

const displayEmail = computed(() => profile.value?.email?.trim() || '')

const displayBio = computed(() => {
  if (isEditing.value) return draftBio.value
  return profile.value?.bio?.trim() || ''
})

const avatarUrl = computed(() => {
  if (isEditing.value) return draftAvatar.value.trim()
  return profile.value?.avatar?.trim() || ''
})

const hasAvatar = computed(() => Boolean(avatarUrl.value))

const initials = computed(() => {
  const name = displayName.value
  if (!name) return '?'
  return name.slice(0, 1).toUpperCase()
})

const reviewCountLabel = computed(() => {
  if (reviewsLoading.value || reviewsError.value) return '我的評論'
  return `我的評論 · ${myReviews.value.length}`
})

function whiskyNameFor(review: PublicReview): string {
  return getWhiskyById(review.whiskyId)?.name?.trim() || `酒款 #${review.whiskyId}`
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

async function loadMyReviews() {
  if (!authStore.isAuthenticated) {
    myReviews.value = []
    return
  }

  reviewsLoading.value = true
  reviewsError.value = ''

  try {
    myReviews.value = await fetchMyReviews()
  } catch (error) {
    myReviews.value = []
    reviewsError.value =
      error instanceof ReviewApiError
        ? error.message
        : '無法載入我的評論'
  } finally {
    reviewsLoading.value = false
  }
}

watch(
  profile,
  (user) => {
    if (!user || isEditing.value) return
    draftName.value = user.name ?? ''
    draftAvatar.value = user.avatar ?? ''
    draftBio.value = user.bio ?? ''
  },
  { immediate: true },
)

onMounted(() => {
  void loadMyReviews()
})

function startEdit() {
  if (!profile.value) return
  draftName.value = profile.value.name ?? ''
  draftAvatar.value = profile.value.avatar ?? ''
  draftBio.value = profile.value.bio ?? ''
  editNotice.value = ''
  isEditing.value = true
}

function cancelEdit() {
  if (!profile.value) return
  draftName.value = profile.value.name ?? ''
  draftAvatar.value = profile.value.avatar ?? ''
  draftBio.value = profile.value.bio ?? ''
  editNotice.value = ''
  isEditing.value = false
}

function saveEdit() {
  // UI only — profile update API will be wired later.
  editNotice.value = '個人資料編輯介面已就緒，儲存功能即將開放。'
  isEditing.value = false
}
</script>

<template>
  <main class="profile">
    <div class="profile-band">
      <div class="panel-inner">
        <header class="page-intro">
          <h1>我的 WhiskyHello</h1>
          <p class="page-sub">管理資料，留下你的品飲足跡。</p>
        </header>

        <section v-if="profile" class="profile-panel" aria-labelledby="profile-heading">
          <div class="profile-header">
            <div class="avatar-wrap" aria-hidden="true">
              <img
                v-if="hasAvatar"
                :src="avatarUrl"
                :alt="`${displayName} 的頭像`"
                class="avatar-image"
              />
              <div v-else class="avatar-fallback">{{ initials }}</div>
            </div>

            <div class="identity">
              <div class="identity-top">
                <h2 id="profile-heading" class="display-name">
                  {{ displayName || '尚未設定名稱' }}
                </h2>
                <Button
                  v-if="!isEditing"
                  type="button"
                  label="編輯"
                  icon="pi pi-pencil"
                  severity="secondary"
                  outlined
                  size="small"
                  class="edit-btn"
                  @click="startEdit"
                />
              </div>
              <p class="display-email">{{ displayEmail || '—' }}</p>
              <p v-if="!isEditing" class="header-bio">
                {{ displayBio || '尚未填寫簡介' }}
              </p>
            </div>
          </div>

          <form v-if="isEditing" class="edit-form" @submit.prevent="saveEdit">
            <label class="edit-field">
              <span class="label">名稱</span>
              <InputText
                v-model="draftName"
                class="field"
                autocomplete="name"
                placeholder="你的顯示名稱"
              />
            </label>

            <label class="edit-field">
              <span class="label">Email</span>
              <InputText
                :model-value="displayEmail"
                class="field"
                type="email"
                disabled
                readonly
              />
            </label>
            <label class="edit-field">
              <span class="label">個人簡介</span>
              <Textarea
                v-model="draftBio"
                class="field"
                rows="4"
                auto-resize
                placeholder="聊聊你喜歡的威士忌、品飲習慣或最近的發現…"
              />
            </label>

            <div class="edit-actions">
              <Button
                type="submit"
                label="儲存"
                icon="pi pi-check"
                class="save-btn"
              />
              <Button
                type="button"
                label="取消"
                severity="secondary"
                text
                class="cancel-btn"
                @click="cancelEdit"
              />
            </div>
          </form>

          <p v-if="editNotice" class="edit-notice" role="status">
            {{ editNotice }}
          </p>
        </section>
      </div>
    </div>

    <template v-if="profile">
      <section class="reviews-panel" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" class="section-title">{{ reviewCountLabel }}</h2>
        <p class="section-desc">你留下的品飲筆記，會慢慢累積成專屬的威士忌足跡。</p>

        <p v-if="reviewsLoading" class="reviews-state">載入中…</p>
        <p v-else-if="reviewsError" class="reviews-state is-error" role="alert">
          {{ reviewsError }}
        </p>
        <div v-else-if="myReviews.length === 0" class="reviews-empty-wrap">
          <p class="reviews-empty">還沒有評論。</p>
          <RouterLink class="empty-cta" to="/whiskies">
            去探索酒款
            <i class="pi pi-chevron-right" aria-hidden="true" />
          </RouterLink>
        </div>

        <ul v-else class="my-review-list">
          <li v-for="review in myReviews" :key="review.id" class="my-review-item">
            <div
              class="my-review-score"
              :style="{ '--level': `${Math.min(Math.max(review.rating, 0), 100)}%` }"
              aria-hidden="true"
            >
              <span class="score-glass"><span class="score-fill" /></span>
              <span class="score-text">
                <span class="score-value">{{ review.rating }}</span>
                <span class="score-max">/100</span>
              </span>
            </div>
            <div class="my-review-body">
              <RouterLink
                class="whisky-name"
                :to="`/whiskies/${review.whiskyId}`"
              >
                {{ whiskyNameFor(review) }}
              </RouterLink>
              <p class="review-title">{{ review.title }}</p>
              <p class="review-excerpt">{{ review.content }}</p>
              <p class="review-meta">
                <time :datetime="review.createdAt">
                  {{ formatRelativeTime(review.createdAt) }}
                </time>
              </p>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>

<style scoped>
.profile {
  min-height: 100%;
  padding-bottom: 3.5rem;
  background: var(--wh-paper);
  color: var(--wh-ink);
}

/* ——— Identity band: continues the dark site header ——— */
.profile-band {
  background:
    radial-gradient(ellipse 60% 120% at 0% 100%, rgba(220, 184, 120, 0.09), transparent 70%),
    var(--wh-night);
  color: var(--wh-cream);
  border-bottom: 1px solid var(--wh-night-line);
}

.panel-inner {
  max-width: 680px;
  margin: 0 auto;
  padding: 2.25rem 1.5rem 2.5rem;
}

.page-intro {
  margin-bottom: 2rem;
}

h1 {
  margin: 0 0 0.25rem;
  font-family: var(--font-body);
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-ui);
  line-height: var(--lh-meta);
  color: var(--wh-gold-bright);
}

.page-sub {
  margin: 0;
  color: var(--wh-mauve);
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
}

.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
}

.avatar-wrap {
  flex-shrink: 0;
  width: 6.5rem;
  height: 6.5rem;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid rgba(220, 184, 120, 0.55);
  outline: 1px solid var(--wh-night-line);
  outline-offset: 5px;
  background: var(--wh-night-raised);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-family: var(--font-display);
  color: var(--wh-gold-bright);
  font-size: 2.25rem;
  font-weight: var(--fw-display);
}

.identity {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding-top: 0.35rem;
}

.identity-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.display-name {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 4vw, 2.375rem);
  font-weight: var(--fw-display);
  line-height: 1.2;
  color: var(--wh-cream);
  word-break: break-word;
}

.display-email {
  margin: 0;
  color: var(--wh-mauve);
  font-size: var(--fs-meta);
  word-break: break-word;
}

.header-bio {
  max-width: 34em;
  margin: 0.75rem 0 0;
  color: rgba(241, 233, 220, 0.82);
  font-size: var(--fs-body-sm);
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.edit-btn {
  flex-shrink: 0;
  color: var(--wh-cream) !important;
  border-color: var(--wh-night-line) !important;
  background: var(--wh-night-raised) !important;
  box-shadow: none !important;
  font-weight: var(--fw-ui) !important;
}

.edit-btn:hover {
  color: var(--wh-gold-bright) !important;
  border-color: rgba(220, 184, 120, 0.45) !important;
}

/* ——— Edit form, on the dark band ——— */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--wh-night-line);
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.edit-field .label {
  font-size: var(--fs-meta);
  font-weight: var(--fw-ui);
  color: var(--wh-mauve);
}

.field,
:deep(.p-inputtext),
:deep(.p-textarea) {
  width: 100%;
}

:deep(.p-inputtext),
:deep(.p-textarea) {
  background: var(--wh-night-raised) !important;
  border: 1px solid rgba(241, 233, 220, 0.16) !important;
  color: var(--wh-cream) !important;
}

:deep(.p-inputtext::placeholder),
:deep(.p-textarea::placeholder) {
  color: rgba(169, 156, 166, 0.75);
}

:deep(.p-inputtext:enabled:focus),
:deep(.p-textarea:enabled:focus) {
  border-color: rgba(220, 184, 120, 0.7) !important;
  box-shadow: 0 0 0 1px rgba(220, 184, 120, 0.35) !important;
}

:deep(.p-inputtext:disabled) {
  opacity: 1;
  background: transparent !important;
  border-style: dashed !important;
  color: var(--wh-mauve) !important;
}

.edit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.25rem;
}

.save-btn {
  border: none !important;
  background: var(--wh-gold-bright) !important;
  color: var(--wh-night) !important;
  font-family: var(--font-body) !important;
  font-weight: var(--fw-emphasis) !important;
}

.save-btn:hover {
  background: var(--wh-gold) !important;
}

.cancel-btn {
  color: var(--wh-mauve) !important;
}

.cancel-btn:hover {
  color: var(--wh-cream) !important;
  background: rgba(241, 233, 220, 0.06) !important;
}

.edit-notice {
  margin: 1.25rem 0 0;
  padding: 0.75rem 0.9rem;
  border-left: 2px solid var(--wh-gold-bright);
  background: rgba(220, 184, 120, 0.08);
  color: var(--wh-cream);
  font-size: var(--fs-meta);
  line-height: 1.6;
}

/* ——— Tasting log ——— */
.reviews-panel {
  max-width: 680px;
  margin: 0 auto;
  padding: 2.25rem 1.5rem 0;
}

.section-title {
  margin: 0 0 0.3rem;
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-display);
  color: var(--wh-ink);
}

.section-desc {
  margin: 0 0 1.25rem;
  color: var(--wh-muted);
  font-size: var(--fs-body-sm);
  line-height: 1.7;
}

.reviews-state,
.reviews-empty {
  margin: 0;
  color: var(--wh-faint);
  font-size: var(--fs-body-sm);
  line-height: 1.55;
}

.reviews-state.is-error {
  color: #b91c1c;
}

.reviews-empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.5rem 0;
  border-top: 1px solid var(--wh-line);
  border-bottom: 1px solid var(--wh-line);
}

.empty-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--wh-amber);
  font-weight: var(--fw-emphasis);
  font-size: var(--fs-body-sm);
  text-decoration: none;
}

.empty-cta .pi {
  font-size: 0.7rem;
}

.empty-cta:hover {
  text-decoration: underline;
}

.empty-cta:focus-visible,
.whisky-name:focus-visible {
  outline: 2px solid var(--wh-amber);
  outline-offset: 2px;
  border-radius: 2px;
}

.my-review-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--wh-line);
}

.my-review-item {
  display: grid;
  grid-template-columns: 4.75rem minmax(0, 1fr);
  gap: 1.25rem;
  padding: 1.35rem 0;
  border-bottom: 1px solid var(--wh-line);
}

/* Score as a glass filled to the rating */
.my-review-score {
  display: flex;
  align-items: flex-end;
  gap: 0.6rem;
  padding-top: 0.2rem;
}

.score-glass {
  position: relative;
  flex-shrink: 0;
  width: 0.7rem;
  height: 3.25rem;
  overflow: hidden;
  border: 1px solid rgba(161, 98, 7, 0.35);
  border-top: none;
  border-radius: 1px 1px 4px 4px;
  background: rgba(201, 164, 106, 0.08);
}

.score-fill {
  position: absolute;
  inset: auto 0 0;
  height: var(--level, 0%);
  background: linear-gradient(to top, var(--wh-amber), var(--wh-gold));
}

.score-text {
  display: flex;
  flex-direction: column;
  line-height: 1;
}

.score-value {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: var(--fw-display);
  line-height: 1;
  color: var(--wh-amber);
  font-variant-numeric: tabular-nums;
}

.score-max {
  margin-top: 0.2rem;
  font-size: 0.72rem;
  font-weight: var(--fw-ui);
  color: var(--wh-faint);
}

.my-review-body {
  min-width: 0;
}

.whisky-name {
  display: inline-block;
  margin: 0 0 0.2rem;
  font-family: var(--font-display);
  color: var(--wh-ink);
  font-weight: var(--fw-display);
  font-size: 1.1rem;
  text-decoration: none;
  line-height: 1.35;
}

.whisky-name:hover {
  color: var(--wh-amber);
}

.review-title {
  margin: 0;
  color: var(--wh-ink-soft);
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-emphasis);
  line-height: 1.45;
}

.review-excerpt {
  margin: 0.35rem 0 0;
  color: var(--wh-muted);
  font-size: 0.9rem;
  line-height: 1.75;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.review-meta {
  margin: 0.5rem 0 0;
  color: var(--wh-faint);
  font-size: var(--fs-meta);
  line-height: 1.5;
}

@media (max-width: 640px) {
  .panel-inner {
    padding: 1.75rem 1rem 2rem;
  }

  .page-intro {
    margin-bottom: 1.5rem;
  }

  .profile-header {
    flex-direction: column;
    gap: 1.1rem;
  }

  .avatar-wrap {
    width: 5.5rem;
    height: 5.5rem;
  }

  .avatar-fallback {
    font-size: 1.9rem;
  }

  .identity {
    width: 100%;
    padding-top: 0;
  }

  .identity-top {
    flex-wrap: wrap;
  }

  .edit-actions {
    flex-direction: column;
  }

  .edit-actions :deep(.p-button) {
    width: 100%;
  }

  .reviews-panel {
    padding: 1.75rem 1rem 0;
  }

  .my-review-item {
    grid-template-columns: 3.75rem minmax(0, 1fr);
    gap: 0.9rem;
  }

  .score-glass {
    height: 2.75rem;
  }

  .score-value {
    font-size: 1.35rem;
  }
}
</style>
