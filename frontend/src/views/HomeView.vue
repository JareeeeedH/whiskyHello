<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { getWhiskyById } from '../services/whiskyService'
import { mockFriendReviews } from '../data/mock/friendReviews'

const router = useRouter()
const searchHint = ref('')

/** Keep only mock reviews whose whiskyId exists in Static Dataset. */
const latestFriendReviews = mockFriendReviews.filter((review) =>
  Boolean(getWhiskyById(review.whiskyId)),
)

/** Duplicate list for seamless CSS marquee loop. */
const reviewFeedLoops = [0, 1] as const
const reviewMarqueePaused = ref(false)

function pauseReviewMarquee() {
  reviewMarqueePaused.value = true
}

function resumeReviewMarquee() {
  reviewMarqueePaused.value = false
}

const capabilities = [
  {
    title: '探索酒款',
    description: '搜尋威士忌，快速找到你想認識的酒款與評分。',
  },
  {
    title: '分享評論',
    description: '閱讀知名評論家筆記，也留下你自己的品飲感受。',
  },
  {
    title: '發現更多',
    description:
      '未來會有專屬侍酒師，依你的口味與當下心情，輕輕推薦適合的那一杯。',
  },
  {
    title: '買賣媒合',
    description:
      '之後也會讓酒友出售收藏、找到想要的酒款，輕輕撮合買賣雙方。',
  },
]

function goWhiskies() {
  void router.push('/whiskies')
}

function goSearchEntry() {
  // Entry only — full search stays on /whiskies
  void router.push('/whiskies')
}
</script>

<template>
  <main class="home">
    <section class="hero">
      <div class="hero-glow" aria-hidden="true" />
      <div class="hero-inner">
        <h1>威你好，從一杯酒開始，慢慢懂你。</h1>
        <p class="lead">
          搜尋酒款、閱讀知名評論，也分享你的品飲感受。
        </p>
        <Button
          label="開始探索威士忌"
          icon="pi pi-search"
          class="hero-cta"
          @click="goWhiskies"
        />
      </div>
    </section>

    <section class="explore section">
      <div class="section-inner explore-grid">
        <div class="left-panel">
          <div class="search-panel">
            <p class="eyebrow">Whisky Search</p>
            <h2>找到你的威士忌</h2>
            <p class="section-desc">
              輸入酒款名稱，進入搜尋頁開始探索。
            </p>
            <form class="search-box" @submit.prevent="goSearchEntry">
              <InputText
                v-model="searchHint"
                placeholder="例如 Macallan、Ardbeg、Lagavulin..."
                class="search-input"
              />
              <Button type="submit" label="去搜尋" icon="pi pi-arrow-right" />
            </form>
          </div>

          <div class="story-panel">
            <p class="eyebrow">Our Story</p>
            <h2>為什麼有 WhiskyHello？</h2>
            <p>
              WhiskyHello 希望讓找酒更簡單、也更有溫度。你可以搜尋酒款、閱讀知名評論，
              再慢慢分享自己的品飲感受——從一杯酒開始，認識威士忌，也認識自己喜歡的味道。
            </p>
          </div>
        </div>

        <div
          class="reviews-panel"
          @mouseenter="pauseReviewMarquee"
          @mouseleave="resumeReviewMarquee"
          @focusin="pauseReviewMarquee"
          @focusout="resumeReviewMarquee"
        >
          <p class="eyebrow">Friend Reviews</p>
          <h2>酒友最新評論</h2>
          <p class="section-desc">看看酒友最近喝了什麼。</p>

          <div class="review-marquee" aria-label="酒友最新評論流動列表">
            <div class="review-marquee-viewport">
              <div
                class="review-marquee-track"
                :class="{ paused: reviewMarqueePaused }"
              >
                <div
                  v-for="loopIndex in reviewFeedLoops"
                  :key="loopIndex"
                  class="review-feed"
                  :aria-hidden="loopIndex === 1"
                >
                  <article
                    v-for="review in latestFriendReviews"
                    :key="`${loopIndex}-${review.id}`"
                    class="review-item"
                  >
                    <div class="review-row">
                      <RouterLink
                        class="whisky-name"
                        :to="`/whiskies/${review.whiskyId}`"
                        :tabindex="loopIndex === 0 ? undefined : -1"
                      >
                        {{ review.whiskyName }}
                      </RouterLink>
                      <span class="rating">{{ review.rating }} / 100</span>
                    </div>
                    <p class="review-summary">
                      <span class="user">{{ review.userName }}</span>
                      <span class="dot">·</span>
                      <span class="time">{{ review.createdAt }}</span>
                      <span class="dot">·</span>
                      <span class="excerpt"
                        >{{ review.title }} — {{ review.content }}</span
                      >
                    </p>
                    <RouterLink
                      class="review-link"
                      :to="`/whiskies/${review.whiskyId}`"
                      :tabindex="loopIndex === 0 ? undefined : -1"
                    >
                      查看評論 →
                    </RouterLink>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="features section">
      <div class="section-inner">
        <p class="eyebrow">Features</p>
        <h2>你可以做什麼</h2>
        <ul class="capability-list">
          <li
            v-for="(item, index) in capabilities"
            :key="item.title"
            class="capability-item"
          >
            <span class="capability-index" aria-hidden="true">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <section class="sommelier section">
      <div class="section-inner sommelier-inner">
        <p class="eyebrow sommelier-eyebrow">Coming soon</p>
        <h2>威你好，今天想喝什麼？</h2>
        <p class="sommelier-lead">
          未來 AI 將了解你的口味、品飲經驗、預算與當下情境，幫你找到適合的那一杯。
        </p>
        <Button
          label="AI Whisky Sommelier｜即將推出"
          severity="secondary"
          outlined
          disabled
        />
      </div>
    </section>

    <footer class="home-footer">
      <p>WhiskyHello · 從一杯酒開始</p>
    </footer>
  </main>
</template>

<style scoped>
.home {
  color: #1c1917;
  width: 100%;
  overflow-x: clip;
}

.hero {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(28, 25, 23, 0.15), rgba(28, 25, 23, 0.55)),
    radial-gradient(ellipse 80% 70% at 15% 0%, rgba(217, 119, 6, 0.3), transparent 55%),
    radial-gradient(ellipse 60% 50% at 90% 40%, rgba(146, 64, 14, 0.2), transparent 50%),
    linear-gradient(160deg, #1c1917 0%, #292524 45%, #1c1917 100%);
  color: #fafaf9;
  padding: 3.5rem 1.5rem 3.25rem;
}

.hero-glow {
  position: absolute;
  inset: auto -10% -35% auto;
  width: 50%;
  height: 65%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.12), transparent 70%);
  pointer-events: none;
}

.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 40rem;
  margin: 0 auto;
  text-align: center;
}

.brand {
  margin: 0 0 0.85rem;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #fbbf24;
}

.hero h1 {
  margin: 0 0 0.85rem;
  font-size: clamp(1.65rem, 4vw, 2.35rem);
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.lead {
  margin: 0 auto 1.5rem;
  max-width: 28rem;
  font-size: 1rem;
  line-height: 1.7;
  color: #d6d3d1;
}

.hero-cta {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 55%, #b45309 100%) !important;
  border: none !important;
  color: #1c1917 !important;
  font-weight: 700 !important;
}

.section {
  padding: 3.75rem 1.5rem;
}

.section-inner {
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
}

.section-inner.narrow {
  max-width: 40rem;
}

.eyebrow {
  margin: 0 0 0.65rem;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #a8a29e;
}

.section h2 {
  margin: 0 0 0.85rem;
  font-size: clamp(1.4rem, 3vw, 1.75rem);
  letter-spacing: -0.01em;
}

.section-desc {
  margin: 0 0 1.35rem;
  color: #57534e;
  line-height: 1.65;
}

.explore {
  background: #fafaf9;
}

.explore-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2.25rem;
  align-items: start;
  width: 100%;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  min-width: 0;
}

.search-box {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.search-input {
  flex: 1 1 10rem;
  min-width: 0;
  width: 100%;
}

.search-panel .section-desc {
  margin-bottom: 1.1rem;
}

.story-panel {
  padding-top: 1.75rem;
  border-top: 1px solid #e7e5e4;
}

.story-panel p:not(.eyebrow) {
  margin: 0;
  font-size: 1rem;
  line-height: 1.8;
  color: #57534e;
}

.reviews-panel {
  min-width: 0;
  padding-top: 1.75rem;
  border-top: 1px solid #e7e5e4;
}

.reviews-panel .section-desc {
  margin-bottom: 0.85rem;
}

.features {
  background: #fff;
}

.features .capability-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.15rem;
  margin-top: 0.35rem;
  width: 100%;
}

.capability-list {
  list-style: none;
  margin: 0.15rem 0 0;
  padding: 0;
}

.capability-item {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  gap: 0.85rem;
  padding: 0.35rem 0 0;
  min-width: 0;
}

.capability-index {
  color: #b45309;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.6;
}

.capability-item h3 {
  margin: 0 0 0.3rem;
  font-size: 1rem;
  font-weight: 700;
}

.capability-item p {
  margin: 0;
  color: #57534e;
  line-height: 1.55;
  font-size: 0.9rem;
}

.review-marquee {
  position: relative;
  width: 100%;
  min-width: 0;
}

.review-marquee-viewport {
  height: 22rem;
  overflow: hidden;
  border-top: 1px solid #e7e5e4;
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 8%,
    #000 92%,
    transparent 100%
  );
}

.review-marquee-track {
  display: flex;
  flex-direction: column;
  animation: review-marquee-up 100s linear infinite;
  will-change: transform;
}

.review-marquee-track.paused {
  animation-play-state: paused;
}

@keyframes review-marquee-up {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-50%);
  }
}

.review-feed {
  display: flex;
  flex-direction: column;
}

.review-item {
  padding: 0.7rem 0;
  border-bottom: 1px solid #e7e5e4;
  min-width: 0;
}

.review-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.whisky-name {
  min-width: 0;
  color: #1c1917;
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.whisky-name:hover {
  color: #b45309;
  text-decoration: underline;
}

.rating {
  flex-shrink: 0;
  color: #b45309;
  font-size: 0.8125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.review-summary {
  margin: 0.25rem 0 0.2rem;
  color: #78716c;
  font-size: 0.75rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-summary .dot {
  margin: 0 0.28rem;
}

.review-summary .excerpt {
  color: #57534e;
}

.review-link {
  color: #b45309;
  font-weight: 600;
  font-size: 0.75rem;
  text-decoration: none;
}

.review-link:hover {
  text-decoration: underline;
}

@media (prefers-reduced-motion: reduce) {
  .review-marquee-track {
    animation: none;
  }

  .review-marquee-viewport {
    height: auto;
    max-height: 26rem;
    overflow-y: auto;
    mask-image: none;
  }

  .review-marquee-track .review-feed[aria-hidden='true'] {
    display: none;
  }
}

.sommelier {
  background:
    radial-gradient(ellipse at bottom left, rgba(180, 83, 9, 0.22), transparent 50%),
    #1c1917;
  color: #fafaf9;
}

.sommelier-inner {
  max-width: 36rem;
  width: 100%;
  text-align: center;
}

.sommelier-eyebrow {
  color: #fbbf24;
}

.sommelier h2 {
  color: #fafaf9;
}

.sommelier-lead {
  margin: 0 0 1.5rem;
  color: #d6d3d1;
  line-height: 1.75;
}

.home-footer {
  padding: 1.75rem 1.5rem;
  text-align: center;
  background: #292524;
  color: #a8a29e;
}

.home-footer p {
  margin: 0;
  font-size: 0.875rem;
}

@media (max-width: 640px) {
  .hero {
    padding: 2.5rem 1rem 2.25rem;
  }

  .section {
    padding: 2.5rem 1rem;
  }

  .search-box {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    flex: 0 0 auto;
    width: 100%;
    align-self: stretch;
  }

  .search-input :deep(.p-inputtext) {
    width: 100%;
    height: 2.75rem;
    min-height: 2.75rem;
    line-height: 1.25;
  }

  .search-box :deep(.p-button) {
    width: 100%;
  }

  .review-marquee-viewport {
    height: 20.5rem;
  }

  .review-summary {
    white-space: normal;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  .sommelier :deep(.p-button) {
    width: 100%;
    white-space: normal;
    line-height: 1.35;
  }
}

@media (min-width: 801px) {
  .explore-grid {
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    gap: 2.5rem 3rem;
  }

  .reviews-panel {
    padding-top: 0;
    padding-left: 2rem;
    border-top: none;
    border-left: 1px solid #e7e5e4;
  }

  .features .capability-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem 2rem;
  }

  .review-marquee-viewport {
    height: 26rem;
  }
}
</style>
