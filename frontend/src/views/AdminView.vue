<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  fetchAdminAuctions,
  fetchAdminReviews,
  fetchAdminUsers,
} from '../services/adminService'
import type { AdminAuction, AdminUserListItem, AuctionStatus } from '../types/admin'
import type { PublicReview } from '../types/review'

/** Auction lifecycle in order; cancelled sits outside the flow and is reported separately. */
const PIPELINE: Array<{ status: AuctionStatus; label: string }> = [
  { status: 'draft', label: 'Draft' },
  { status: 'scheduled', label: 'Scheduled' },
  { status: 'active', label: 'Live' },
  { status: 'ended', label: 'Ended' },
]

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const users = ref<AdminUserListItem[] | null>(null)
const auctions = ref<AdminAuction[] | null>(null)
const reviews = ref<PublicReview[] | null>(null)
const loading = ref(true)
const updatedAt = ref<Date | null>(null)

const failed = computed(() => ({
  users: !loading.value && users.value === null,
  auctions: !loading.value && auctions.value === null,
  reviews: !loading.value && reviews.value === null,
}))

function countStatus(status: AuctionStatus): number {
  return auctions.value?.filter((auction) => auction.status === status).length ?? 0
}

const pipeline = computed(() =>
  PIPELINE.map((step) => ({ ...step, count: countStatus(step.status) })),
)

const pipelineTotal = computed(() =>
  pipeline.value.reduce((sum, step) => sum + step.count, 0),
)

const cancelledCount = computed(() => countStatus('cancelled'))

function isWithinWeek(value: string): boolean {
  const time = new Date(value).getTime()
  return !Number.isNaN(time) && Date.now() - time <= WEEK_MS
}

const tools = computed(() => {
  const userList = users.value
  const auctionList = auctions.value
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
      key: 'auctions',
      to: '/admin/auctions',
      name: 'Auctions',
      description: 'Create drafts, edit them and start auctions.',
      action: 'Open auctions',
      figure: auctionList ? countStatus('active') : undefined,
      figureLabel: 'live now',
      detail: auctionList ? `${countStatus('draft')} drafts waiting` : '',
      failed: failed.value.auctions,
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
  const [userResult, auctionResult, reviewResult] = await Promise.allSettled([
    fetchAdminUsers(),
    fetchAdminAuctions(),
    fetchAdminReviews(),
  ])
  users.value = userResult.status === 'fulfilled' ? userResult.value : null
  auctions.value = auctionResult.status === 'fulfilled' ? auctionResult.value : null
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

        <div class="pipeline">
          <div class="pipeline-head">
            <h2 class="pipeline-title">Auction pipeline</h2>
            <span v-if="auctions" class="pipeline-total">
              {{ pipelineTotal }} in progress or finished
            </span>
          </div>

          <p v-if="failed.auctions" class="pipeline-note">
            Auction data didn't load. Use Refresh to try again.
          </p>
          <p v-else-if="!loading && pipelineTotal === 0" class="pipeline-note">
            No auctions yet. Create a draft in Auctions to start the pipeline.
          </p>

          <template v-else>
            <div
              class="pipeline-bar"
              :class="{ 'is-loading': loading }"
              role="img"
              :aria-label="pipeline.map((step) => `${step.label} ${step.count}`).join(', ')"
            >
              <span
                v-for="step in pipeline"
                v-show="loading || step.count > 0"
                :key="step.status"
                class="pipeline-segment"
                :class="`is-${step.status}`"
                :style="{ flexGrow: loading ? 1 : step.count }"
              />
            </div>

            <ol class="pipeline-steps">
              <li
                v-for="step in pipeline"
                :key="step.status"
                class="pipeline-step"
                :class="`is-${step.status}`"
              >
                <span class="step-count">{{ loading ? '–' : step.count }}</span>
                <span class="step-label">{{ step.label }}</span>
              </li>
            </ol>

            <p v-if="cancelledCount > 0" class="pipeline-cancelled">
              {{ cancelledCount }} cancelled, not shown in the bar
            </p>
          </template>
        </div>
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
  --status-draft: #e0a24c;
  --status-scheduled: #7fa6d9;
  --status-active: #7cc49a;
  --status-ended: var(--wh-mauve);

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
  margin-bottom: 2.25rem;
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

/* ——— Auction pipeline: the one bold element ——— */
.pipeline {
  padding: 1.5rem 1.5rem 1.35rem;
  border: 1px solid var(--wh-night-line);
  border-radius: 10px;
  background: var(--wh-night-raised);
}

.pipeline-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.25rem 1rem;
  margin-bottom: 1.1rem;
}

.pipeline-title {
  font-family: var(--font-body);
  font-size: var(--fs-body);
  font-weight: var(--fw-emphasis);
  color: var(--wh-cream);
}

.pipeline-total,
.pipeline-cancelled {
  color: var(--wh-mauve);
  font-size: var(--fs-meta);
  font-variant-numeric: tabular-nums;
}

.pipeline-cancelled {
  margin: 1rem 0 0;
}

.pipeline-note {
  margin: 0;
  color: var(--wh-mauve);
  font-size: var(--fs-body-sm);
}

.pipeline-bar {
  display: flex;
  gap: 3px;
  height: 14px;
  margin-bottom: 1.25rem;
  overflow: hidden;
  border-radius: 3px;
}

.pipeline-segment {
  flex-basis: 0;
  min-width: 6px;
  background: currentColor;
  transform-origin: left center;
  animation: fill 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
  transition: flex-grow 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.pipeline-bar.is-loading .pipeline-segment {
  opacity: 0.25;
  animation: none;
}

.pipeline-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pipeline-step {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding-left: 0.75rem;
  border-left: 2px solid currentColor;
}

.step-count {
  color: var(--wh-cream);
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: var(--fw-score);
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.step-label {
  color: var(--wh-mauve);
  font-size: var(--fs-meta);
}

.is-draft { color: var(--status-draft); }
.is-scheduled { color: var(--status-scheduled); }
.is-active { color: var(--status-active); }
.is-ended { color: var(--status-ended); }

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

  .pipeline {
    padding: 1.1rem 1rem;
  }

  .pipeline-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

@keyframes fill {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .pipeline-segment,
  .is-spinning,
  .tool-action .pi {
    animation: none;
    transition: none;
  }
}
</style>
