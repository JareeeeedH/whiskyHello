<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import { RouterLink, useRouter } from 'vue-router'
import { fetchAdminReviews } from '../services/adminService'
import { getWhiskyById } from '../services/whiskyService'
import type { PublicReview } from '../types/review'

const router = useRouter()
const reviews = ref<PublicReview[]>([])
const loading = ref(true)
const errorMessage = ref('')

function whiskyNameFor(review: PublicReview): string {
  return getWhiskyById(review.whiskyId)?.name?.trim() || `Whisky #${review.whiskyId}`
}

function formatCreatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

async function loadReviews() {
  loading.value = true
  errorMessage.value = ''
  try {
    reviews.value = await fetchAdminReviews()
  } catch {
    reviews.value = []
    errorMessage.value = 'Unable to load reviews. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadReviews()
})
</script>

<template>
  <main class="admin-reviews">
    <header class="page-intro">
      <div class="intro-row">
        <div>
          <h1>Review Management</h1>
          <p class="page-sub">
            Read-only list of all reviews<template v-if="!loading && !errorMessage">
              ({{ reviews.length }})</template>.
          </p>
        </div>
        <Button
          label="Back"
          severity="secondary"
          text
          @click="router.push('/admin')"
        />
      </div>
    </header>

    <Card class="reviews-panel" :pt="{ body: { class: 'reviews-body' } }">
      <template #content>
        <div v-if="loading" class="state" role="status">Loading reviews…</div>

        <div v-else-if="errorMessage" class="state state-error" role="alert">
          <p>{{ errorMessage }}</p>
          <Button label="Retry" severity="secondary" @click="loadReviews" />
        </div>

        <div v-else-if="reviews.length === 0" class="state">
          No reviews found.
        </div>

        <ul v-else class="review-list" aria-label="Reviews">
          <li v-for="review in reviews" :key="review.id" class="review-row">
            <div class="review-top">
              <span class="review-rating">{{ review.rating }}</span>
              <div class="review-head">
                <span class="review-title">{{ review.title }}</span>
                <RouterLink
                  class="review-whisky"
                  :to="`/whiskies/${encodeURIComponent(review.whiskyId)}`"
                >
                  {{ whiskyNameFor(review) }}
                </RouterLink>
              </div>
            </div>
            <p class="review-meta">
              {{ review.authorName || 'Unknown user' }} ·
              {{ formatCreatedAt(review.createdAt) }}
            </p>
            <p class="review-content">{{ review.content }}</p>
            <ul
              v-if="review.nose || review.taste || review.finish"
              class="note-list"
            >
              <li v-if="review.nose" class="note-chip">香氣 · {{ review.nose }}</li>
              <li v-if="review.taste" class="note-chip">口感 · {{ review.taste }}</li>
              <li v-if="review.finish" class="note-chip">尾韻 · {{ review.finish }}</li>
            </ul>
          </li>
        </ul>
      </template>
    </Card>
  </main>
</template>

<style scoped>
.admin-reviews {
  max-width: 720px;
  margin: 0 auto;
  padding: 2.25rem 1.5rem 3.5rem;
  color: #1c1917;
}

.page-intro {
  margin-bottom: 1.5rem;
}

.intro-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

h1 {
  margin: 0 0 0.35rem;
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: 600;
  letter-spacing: normal;
  line-height: 1.25;
  color: #1c1917;
}

.page-sub {
  margin: 0;
  font-family: var(--font-body);
  color: #a8a29e;
  font-size: 0.95rem;
  line-height: 1.55;
  font-weight: 400;
}

.reviews-panel {
  border: 1px solid #f0eeeb;
  background: #fff;
  box-shadow: none;
}

:deep(.reviews-body) {
  padding-top: 0.25rem;
}

.state {
  padding: 1.25rem 0.25rem;
  color: #78716c;
  font-size: 0.95rem;
}

.state-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  color: #b91c1c;
}

.state-error p {
  margin: 0;
}

.review-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.review-row {
  padding: 1rem 0.15rem;
  border-bottom: 1px solid #f5f5f4;
  font-family: var(--font-body);
}

.review-row:last-child {
  border-bottom: none;
  padding-bottom: 0.25rem;
}

.review-top {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
}

.review-rating {
  flex-shrink: 0;
  min-width: 2.5rem;
  color: #b45309;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.2;
}

.review-head {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.review-title {
  font-weight: 600;
  word-break: break-word;
}

.review-whisky {
  color: #78716c;
  font-size: 0.85rem;
  text-decoration: none;
  word-break: break-word;
}

.review-whisky:hover {
  color: #b45309;
  text-decoration: underline;
}

.review-meta {
  margin: 0.4rem 0 0;
  color: #a8a29e;
  font-size: 0.82rem;
}

.review-content {
  margin: 0.45rem 0 0;
  color: #44403c;
  font-size: 0.92rem;
  line-height: 1.65;
  white-space: pre-line;
  word-break: break-word;
}

.note-list {
  list-style: none;
  margin: 0.55rem 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.note-chip {
  padding: 0.15rem 0.55rem;
  border: 1px solid #e7e5e4;
  border-radius: 999px;
  color: #78716c;
  font-size: 0.78rem;
  line-height: 1.5;
}

@media (max-width: 480px) {
  .intro-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
