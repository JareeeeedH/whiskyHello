<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchAdminReviews, fetchAdminUsers } from '../services/adminService'
import type { AdminUserListItem } from '../types/admin'
import type { PublicReview } from '../types/review'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const users = ref<AdminUserListItem[] | null>(null)
const reviews = ref<PublicReview[] | null>(null)
const loading = ref(true)
const updatedAt = ref<Date | null>(null)

const failed = computed(() => ({
  users: !loading.value && users.value === null,
  reviews: !loading.value && reviews.value === null,
}))

function isWithinWeek(value: string): boolean {
  const time = new Date(value).getTime()
  return !Number.isNaN(time) && Date.now() - time <= WEEK_MS
}

const tools = computed(() => {
  const userList = users.value
  const reviewList = reviews.value

  const averageRating =
    reviewList && reviewList.length > 0
      ? Math.round(
          reviewList.reduce((sum, review) => sum + review.rating, 0) /
            reviewList.length,
        )
      : null

  return [
    {
      key: 'users',
      to: '/admin/users',
      name: 'Members',
      description: 'Accounts, roles and join dates.',
      action: 'Open members',
      figure: userList?.length,
      figureLabel: 'members',
      detail: userList
        ? `${userList.filter((user) => isWithinWeek(user.createdAt)).length} joined this week`
        : '',
      failed: failed.value.users,
    },
    {
      key: 'reviews',
      to: '/admin/reviews',
      name: 'Reviews',
      description: 'Every member review with whisky, author and rating.',
      action: 'Open reviews',
      figure: reviewList?.length,
      figureLabel: 'reviews',
      detail: averageRating === null ? '' : `Average rating ${averageRating}`,
      failed: failed.value.reviews,
    },
  ]
})

const updatedLabel = computed(() =>
  updatedAt.value
    ? new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(updatedAt.value)
    : '',
)

async function loadOverview() {
  loading.value = true
  const [userResult, reviewResult] = await Promise.allSettled([
    fetchAdminUsers(),
    fetchAdminReviews(),
  ])
  users.value = userResult.status === 'fulfilled' ? userResult.value : null
  reviews.value = reviewResult.status === 'fulfilled' ? reviewResult.value : null
  updatedAt.value = new Date()
  loading.value = false
}

onMounted(() => {
  void loadOverview()
})
</script>

<template>
  <main class="admin">
    <section class="console" aria-labelledby="admin-title">
      <div class="console-inner">
        <header class="console-head">
          <div>
            <h1 id="admin-title">Admin</h1>
            <p class="console-sub">What's happening on WhiskyHello right now.</p>
          </div>
          <div class="refresh">
            <span v-if="updatedLabel" class="refresh-time" aria-live="polite">
              Updated {{ updatedLabel }}
            </span>
            <button
              type="button"
              class="refresh-button"
              :disabled="loading"
              @click="loadOverview"
            >
              <i class="pi pi-refresh" :class="{ 'is-spinning': loading }" aria-hidden="true" />
              {{ loading ? 'Refreshing' : 'Refresh' }}
            </button>
          </div>
        </header>
      </div>
    </section>

    <section class="tools" aria-label="Admin tools">
      <RouterLink
        v-for="tool in tools"
        :key="tool.key"
        :to="tool.to"
        class="tool"
      >
        <span class="tool-text">
          <span class="tool-name">{{ tool.name }}</span>
          <span class="tool-description">{{ tool.description }}</span>
        </span>

        <span class="tool-figure">
          <template v-if="tool.failed">
            <span class="figure-error">Couldn't load</span>
          </template>
          <template v-else>
            <span class="figure-value">
              {{ tool.figure ?? '–' }}
              <span class="figure-label">{{ tool.figureLabel }}</span>
            </span>
            <span v-if="tool.detail" class="figure-detail">{{ tool.detail }}</span>
          </template>
        </span>

        <span class="tool-action">
          {{ tool.action }}
          <i class="pi pi-chevron-right" aria-hidden="true" />
        </span>
      </RouterLink>
    </section>
  </main>
</template>

<style scoped>
.admin {
  min-height: 100%;
  background: var(--wh-paper);
  color: var(--wh-ink);
  padding-bottom: 3.5rem;
}

/* ——— Console band: continues the dark site header ——— */
.console {
  background:
    linear-gradient(var(--wh-night-line) 1px, transparent 1px) 0 0 / 100% 2rem,
    var(--wh-night);
  color: var(--wh-cream);
  border-bottom: 1px solid var(--wh-night-line);
}

.console-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 2.25rem 1.5rem 2.5rem;
}

.console-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem 2rem;
}

h1 {
  margin: 0 0 0.25rem;
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: var(--fw-display);
  line-height: var(--lh-heading);
  color: var(--wh-cream);
}

.console-sub {
  margin: 0;
  color: var(--wh-mauve);
  font-size: var(--fs-body-sm);
  line-height: var(--lh-meta);
}

.refresh {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.refresh-time {
  color: var(--wh-mauve);
  font-size: var(--fs-meta);
  font-variant-numeric: tabular-nums;
}

.refresh-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.9rem;
  border: 1px solid var(--wh-night-line);
  border-radius: 6px;
  background: var(--wh-night-raised);
  color: var(--wh-cream);
  font: inherit;
  font-size: var(--fs-meta);
  font-weight: var(--fw-ui);
  cursor: pointer;
}

.refresh-button:hover:not(:disabled) {
  border-color: rgba(220, 184, 120, 0.45);
}

.refresh-button:disabled {
  cursor: progress;
  opacity: 0.7;
}

.refresh-button:focus-visible {
  outline: 2px solid var(--wh-gold-bright);
  outline-offset: 2px;
}

.is-spinning {
  animation: spin 0.9s linear infinite;
}

/* ——— Tools: a ledger of rows, each carrying its live figure ——— */
.tools {
  max-width: 960px;
  margin: 2rem auto 0;
  padding: 0 1.5rem;
}

.tool {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 12rem auto;
  align-items: center;
  gap: 1.5rem;
  padding: 1.25rem 0.75rem;
  border-bottom: 1px solid var(--wh-line);
  color: inherit;
  text-decoration: none;
}

.tool:first-child {
  border-top: 1px solid var(--wh-line);
}

.tool:hover {
  background: #fff;
}

.tool:focus-visible {
  outline: 2px solid var(--wh-amber);
  outline-offset: -2px;
  border-radius: 4px;
}

.tool-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.tool-name {
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-display);
  line-height: var(--lh-heading);
}

.tool-description {
  color: var(--wh-muted);
  font-size: var(--fs-body-sm);
  line-height: var(--lh-meta);
}

.tool-figure {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.figure-value {
  font-size: 1.5rem;
  font-weight: var(--fw-score);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.figure-label {
  margin-left: 0.3rem;
  color: var(--wh-muted);
  font-size: var(--fs-meta);
  font-weight: var(--fw-body);
}

.figure-detail {
  color: var(--wh-faint);
  font-size: var(--fs-meta);
  font-variant-numeric: tabular-nums;
}

.figure-error {
  color: #b91c1c;
  font-size: var(--fs-meta);
}

.tool-action {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--wh-amber);
  font-size: var(--fs-meta);
  font-weight: var(--fw-ui);
  white-space: nowrap;
}

.tool-action .pi {
  font-size: 0.7rem;
  transition: transform 0.2s ease;
}

.tool:hover .tool-action .pi {
  transform: translateX(3px);
}

@media (max-width: 640px) {
  .console-inner {
    padding: 1.75rem 1rem 2rem;
  }

  .tools {
    padding: 0 1rem;
  }

  .tool {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem 1rem;
    padding: 1.1rem 0.25rem;
  }

  .tool-text {
    grid-column: 1 / -1;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .is-spinning,
  .tool-action .pi {
    animation: none;
    transition: none;
  }
}
</style>
