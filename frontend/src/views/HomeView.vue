<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import NewsCard from '../components/NewsCard.vue'
import { getRandomNews } from '../data/news'
import { mockFriendReviews } from '../data/mock/friendReviews'

const router = useRouter()
const searchHint = ref('')

/** Homepage news feed — swap getRandomNews for API later. */
const newsItems = getRandomNews(3)
const featuredNews = computed(() => newsItems[0])
const sideNews = computed(() => newsItems.slice(1))

/**
 * Mock reviews are curated for the homepage.
 * Avoid importing whiskyService here — it pulls the full static dataset JSON
 * into the Home route chunk and causes a long blank first paint.
 */
const latestFriendReviews = mockFriendReviews

/** Duplicate list for seamless CSS marquee loop. */
const reviewFeedLoops = [0, 1] as const
const reviewMarqueePaused = ref(false)
const heroGlassSrc = `${import.meta.env.BASE_URL}hero-glass.svg`

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
      <div class="hero-atmosphere" aria-hidden="true">
        <div class="hero-grain" />
        <div class="hero-glow hero-glow--warm" />
        <div class="hero-glow hero-glow--edge" />
        <img
          class="hero-glass"
          :src="heroGlassSrc"
          alt=""
          width="280"
          height="420"
          decoding="async"
        />
      </div>
      <div class="hero-shell">
        <div class="hero-inner">
        <p class="brand hero-reveal hero-reveal--1">WhiskyHello</p>
        <h1 class="hero-reveal hero-reveal--2">
          從探索開始，<br class="hero-break" />走向你的酒單。
        </h1>
        <p class="lead hero-reveal hero-reveal--3">
          搜尋酒款、閱讀知名評論，也分享你的品飲感受。
        </p>
        <Button
          label="開始探索威士忌"
          icon="pi pi-search"
          class="hero-cta hero-reveal hero-reveal--4"
          @click="goWhiskies"
        />
        </div>
      </div>
    </section>

    <div class="luxury-rule" aria-hidden="true" />

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
          <h2>看看酒友最近喝了什麼。</h2>

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

    <section class="news section" aria-labelledby="home-news-heading">
      <div class="section-inner">
        <div class="news-header">
          <p class="eyebrow">Whisky News</p>
          <h2 id="home-news-heading">值得關注</h2>
        </div>

        <div v-if="featuredNews" class="news-layout">
          <NewsCard :item="featuredNews" featured class="news-featured" />
          <div class="news-side">
            <NewsCard
              v-for="item in sideNews"
              :key="item.id"
              :item="item"
            />
          </div>
        </div>
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
    linear-gradient(105deg, rgba(12, 10, 9, 0.92) 0%, rgba(28, 25, 23, 0.72) 48%, rgba(28, 25, 23, 0.55) 100%),
    radial-gradient(ellipse 70% 80% at 12% 20%, rgba(180, 83, 9, 0.28), transparent 58%),
    radial-gradient(ellipse 55% 60% at 88% 70%, rgba(146, 64, 14, 0.22), transparent 55%),
    linear-gradient(165deg, #0c0a09 0%, #1c1917 42%, #292524 72%, #1c1917 100%);
  color: #fafaf9;
  padding: 3.75rem 1.5rem 3.5rem;
  box-shadow: inset 0 -1px 0 rgba(251, 191, 36, 0.18);
}

.hero-atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.hero-grain {
  position: absolute;
  inset: 0;
  opacity: 0.14;
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255, 255, 255, 0.015) 2px,
      rgba(255, 255, 255, 0.015) 3px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.04) 2px,
      rgba(0, 0, 0, 0.04) 3px
    );
  mix-blend-mode: soft-light;
}

.hero-glow {
  position: absolute;
  pointer-events: none;
}

.hero-glow--warm {
  inset: auto -8% -40% auto;
  width: min(52%, 28rem);
  height: 70%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.16), transparent 68%);
}

.hero-glow--edge {
  inset: -20% auto auto -15%;
  width: min(48%, 24rem);
  height: 55%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.1), transparent 70%);
}

.hero-glass {
  position: absolute;
  right: max(2%, 0.5rem);
  bottom: -6%;
  width: min(34vw, 15.5rem);
  height: auto;
  opacity: 0.42;
  filter: drop-shadow(0 18px 40px rgba(0, 0, 0, 0.45));
  transform: rotate(-4deg);
}

.hero-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 34rem;
  margin: 0;
  text-align: left;
}

.brand {
  margin: 0 0 0.95rem;
  font-size: clamp(1.05rem, 2.4vw, 1.25rem);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: none;
  color: #fbbf24;
  text-shadow: 0 0 24px rgba(251, 191, 36, 0.22);
}

.hero h1 {
  margin: 0 0 0.9rem;
  font-size: clamp(1.85rem, 4.6vw, 2.65rem);
  line-height: 1.22;
  font-weight: 700;
  letter-spacing: -0.035em;
  text-wrap: balance;
}

/* Mobile-only soft break; desktop keeps single-line flow. */
.hero-break {
  display: none;
}

.lead {
  margin: 0 0 1.6rem;
  max-width: 28rem;
  font-size: 1.02rem;
  line-height: 1.7;
  color: #d6d3d1;
}

.hero-cta {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, transparent 42%),
    linear-gradient(135deg, #fbbf24 0%, #f59e0b 42%, #d97706 78%, #b45309 100%) !important;
  border: 1px solid rgba(253, 230, 138, 0.55) !important;
  color: #1c1917 !important;
  font-weight: 700 !important;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.28) inset,
    0 -1px 0 rgba(120, 53, 15, 0.35) inset,
    0 10px 28px rgba(0, 0, 0, 0.28) !important;
  transition:
    box-shadow 0.35s ease,
    filter 0.35s ease,
    transform 0.35s ease !important;
}

.hero-cta:hover {
  filter: brightness(1.06);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.38) inset,
    0 -1px 0 rgba(120, 53, 15, 0.3) inset,
    0 0 0 1px rgba(253, 230, 138, 0.35),
    0 14px 32px rgba(180, 83, 9, 0.28) !important;
}

.hero-cta:focus-visible {
  outline: 2px solid #fde68a;
  outline-offset: 3px;
}

.hero-reveal {
  animation: hero-fade-up 0.9s ease both;
}

.hero-reveal--1 {
  animation-delay: 0.05s;
}

.hero-reveal--2 {
  animation-delay: 0.16s;
}

.hero-reveal--3 {
  animation-delay: 0.28s;
}

.hero-reveal--4 {
  animation-delay: 0.4s;
}

@keyframes hero-fade-up {
  from {
    opacity: 0;
    transform: translateY(0.65rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

.section {
  padding: 3.75rem 1.5rem;
}

.section-inner {
  max-width: 1120px;
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
  border-top: 1px solid rgba(180, 83, 9, 0.18);
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
  border-top: 1px solid rgba(180, 83, 9, 0.18);
}

.reviews-panel .section-desc {
  margin-bottom: 0.85rem;
}

.features {
  background: #fff;
}

.news {
  background: #fafaf9;
}

.news-header {
  margin-bottom: 1.5rem;
}

.news-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.15rem;
}

.news-side {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.15rem;
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
  .hero-reveal {
    animation: none;
  }

  .hero-cta {
    transition: none !important;
  }

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
  /* Compact Hero: keep brand identity, free first screen for Search / Community. */
  .hero {
    min-height: 0;
    max-height: none;
    padding: 1.15rem 1rem 1.1rem;
  }

  .hero-shell {
    padding: 0;
  }

  .hero-inner {
    max-width: 100%;
    padding-right: 0;
  }

  .brand {
    margin: 0 0 0.4rem;
    font-size: 0.92rem;
    letter-spacing: 0.1em;
  }

  .hero-break {
    display: block;
  }

  .hero h1 {
    margin: 0 0 0.4rem;
    font-size: 1.45rem;
    line-height: 1.28;
    letter-spacing: -0.03em;
    text-wrap: unset;
  }

  .lead {
    margin: 0 0 0.85rem;
    max-width: 20rem;
    font-size: 0.875rem;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  .hero-cta {
    font-size: 0.875rem !important;
    padding: 0.55rem 0.95rem !important;
  }

  .hero-glass {
    width: min(28vw, 5.25rem);
    opacity: 0.16;
    right: -0.75rem;
    bottom: -18%;
    filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.35));
    transform: rotate(-6deg);
  }

  .hero-glow--warm {
    width: min(42%, 14rem);
    height: 55%;
    opacity: 0.7;
  }

  .hero-glow--edge {
    width: min(40%, 12rem);
    height: 45%;
    opacity: 0.65;
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
    width: auto;
    align-self: flex-start;
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

  .news-layout {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    gap: 1.25rem;
    align-items: start;
  }

  .news-side {
    gap: 1rem;
  }
}
</style>
