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
    <header class="page-intro">
      <h1>我的 WhiskyHello</h1>
      <p class="page-sub">管理資料，留下你的品飲足跡。</p>
    </header>

    <template v-if="profile">
      <section class="profile-panel" aria-labelledby="profile-heading">
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

      <section class="reviews-panel" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" class="section-title">{{ reviewCountLabel }}</h2>
        <p class="section-desc">你留下的品飲筆記，會慢慢累積成專屬的威士忌足跡。</p>

        <p v-if="reviewsLoading" class="reviews-state">載入中…</p>
        <p v-else-if="reviewsError" class="reviews-state is-error" role="alert">
          {{ reviewsError }}
        </p>
        <div v-else-if="myReviews.length === 0" class="reviews-empty-wrap">
          <p class="reviews-empty">還沒有評論。</p>
          <RouterLink class="empty-cta" to="/whiskies">去探索酒款 →</RouterLink>
        </div>

        <ul v-else class="my-review-list">
          <li v-for="review in myReviews" :key="review.id" class="my-review-item">
            <div class="my-review-score" aria-hidden="true">
              <span class="score-value">{{ review.rating }}</span>
              <span class="score-max">/100</span>
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
  max-width: 640px;
  margin: 0 auto;
  padding: 2.25rem 1.5rem 3.5rem;
  color: #1c1917;
}

.page-intro {
  margin-bottom: 1.5rem;
}

h1 {
  margin: 0 0 0.35rem;
  font-size: clamp(1.65rem, 3.5vw, 2rem);
  letter-spacing: -0.03em;
  color: #1c1917;
}

.page-sub {
  margin: 0;
  color: #a8a29e;
  font-size: 0.95rem;
  line-height: 1.5;
}

.profile-panel,
.reviews-panel,
.account-panel {
  padding: 1.35rem 1.25rem;
  border: 1px solid #f0eeeb;
  background: #fff;
  box-shadow: none;
}

.profile-panel {
  margin-bottom: 0.85rem;
}

.reviews-panel,
.account-panel {
  margin-bottom: 1rem;
}

.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 1.15rem;
}

.avatar-wrap {
  flex-shrink: 0;
  width: 5.75rem;
  height: 5.75rem;
  overflow: hidden;
  border-radius: 999px;
  border: 2px solid rgba(217, 119, 6, 0.28);
  background: linear-gradient(145deg, #fff7ed 0%, #f5f5f4 100%);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
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
  color: #b45309;
  font-size: 1.75rem;
  font-weight: 700;
}

.identity {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  align-items: stretch;
}

.identity-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.display-name {
  margin: 0;
  font-size: clamp(1.35rem, 2.8vw, 1.65rem);
  letter-spacing: -0.025em;
  color: #1c1917;
  word-break: break-word;
}

.display-email {
  margin: 0;
  color: #a8a29e;
  font-size: 0.9rem;
  word-break: break-word;
}

.header-bio {
  margin: 0.35rem 0 0;
  color: #57534e;
  font-size: 0.95rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.edit-btn {
  flex-shrink: 0;
  color: #78716c !important;
  border-color: #e7e5e4 !important;
  background: #fff !important;
  box-shadow: none !important;
  font-weight: 600 !important;
}

.edit-btn:hover {
  color: #b45309 !important;
  border-color: rgba(217, 119, 6, 0.35) !important;
  background: #fffbeb !important;
}

.edit-field .label,
.section-title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #a8a29e;
}

.section-title {
  margin-bottom: 0.35rem;
  font-size: 1rem;
  letter-spacing: -0.01em;
  color: #44403c;
  font-weight: 700;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.15rem;
  padding-top: 1.15rem;
  border-top: 1px solid #f0eeeb;
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field,
:deep(.p-inputtext),
:deep(.p-textarea) {
  width: 100%;
}

:deep(.p-inputtext),
:deep(.p-textarea) {
  background: #fff !important;
  border: 1px solid #e7e5e4 !important;
  color: #1c1917 !important;
}

:deep(.p-inputtext:enabled:focus),
:deep(.p-textarea:enabled:focus) {
  border-color: rgba(217, 119, 6, 0.55) !important;
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.25) !important;
}

:deep(.p-inputtext:disabled) {
  opacity: 0.75;
  background: #f5f5f4 !important;
  color: #78716c !important;
}

.field-hint {
  font-size: 0.8125rem;
  color: #a8a29e;
}

.edit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.25rem;
}

.save-btn {
  border: none !important;
  background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%) !important;
  color: #1c1917 !important;
  font-weight: 700 !important;
}

.cancel-btn {
  color: #78716c !important;
}

.edit-notice {
  margin: 1rem 0 0;
  padding: 0.75rem 0.85rem;
  border-radius: 0.5rem;
  background: #fff7ed;
  color: #92400e;
  font-size: 0.875rem;
  line-height: 1.5;
}

.section-desc {
  margin: 0 0 0.85rem;
  color: #78716c;
  line-height: 1.55;
  font-size: 0.9375rem;
}

.reviews-state,
.reviews-empty {
  margin: 0.35rem 0 0;
  color: #a8a29e;
  font-size: 0.9375rem;
  line-height: 1.55;
}

.reviews-empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.55rem;
  margin-top: 0.35rem;
}

.empty-cta {
  color: #b45309;
  font-weight: 600;
  font-size: 0.9375rem;
  text-decoration: none;
}

.empty-cta:hover {
  text-decoration: underline;
}

.reviews-state.is-error {
  color: #b91c1c;
}

.my-review-list {
  margin: 0.45rem 0 0;
  padding: 0;
  list-style: none;
}

.my-review-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem 0.95rem;
  padding: 0.95rem 0;
  border-bottom: 1px solid #f0eeeb;
}

.my-review-item:last-child {
  border-bottom: none;
  padding-bottom: 0.15rem;
}

.my-review-score {
  display: flex;
  align-items: baseline;
  gap: 0.1rem;
  min-width: 3.2rem;
  padding-top: 0.15rem;
}

.score-value {
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
  color: #b45309;
}

.score-max {
  font-size: 0.72rem;
  font-weight: 600;
  color: #a8a29e;
}

.my-review-body {
  min-width: 0;
}

.whisky-name {
  display: inline-block;
  margin: 0 0 0.15rem;
  color: #1c1917;
  font-weight: 700;
  font-size: 1.02rem;
  text-decoration: none;
  letter-spacing: -0.02em;
  line-height: 1.35;
}

.whisky-name:hover {
  color: #b45309;
}

.review-title {
  margin: 0;
  color: #78716c;
  font-size: 0.875rem;
  font-weight: 500;
}

.review-excerpt {
  margin: 0.35rem 0 0;
  color: #57534e;
  font-size: 0.9rem;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.review-meta {
  margin: 0.4rem 0 0;
  color: #a8a29e;
  font-size: 0.8125rem;
}

.logout-btn {
  border-color: #d6d3d1 !important;
  color: #57534e !important;
}

.logout-btn:hover {
  border-color: #b45309 !important;
  color: #b45309 !important;
  background: #fff7ed !important;
}

@media (max-width: 640px) {
  .profile {
    padding: 1.5rem 1rem 2.75rem;
  }

  .profile-panel,
  .reviews-panel,
  .account-panel {
    padding: 1.25rem 1.05rem;
  }

  .profile-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .avatar-wrap {
    width: 5.5rem;
    height: 5.5rem;
  }

  .avatar-fallback {
    font-size: 1.7rem;
  }

  .identity {
    width: 100%;
  }

  .edit-btn {
    width: auto;
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

  .my-review-item {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }
}
</style>
