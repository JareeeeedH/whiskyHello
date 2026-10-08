<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import NewsCard from '../components/NewsCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { getRandomNews } from '../data/news'
import { fetchLatestReviews } from '../services/reviewService'
import type { PublicReview } from '../types/review'

const router = useRouter()
const searchHint = ref('')

/** Homepage news feed — swap getRandomNews for API later. */
const newsItems = getRandomNews(3)
const featuredNews = computed(() => newsItems[0])
const sideNews = computed(() => newsItems.slice(1))

/**
 * Avoid importing whiskyService here — it pulls the full static dataset JSON
 * into the Home route chunk and causes a long blank first paint.
 */
const latestFriendReviews = ref<PublicReview[]>([])
const reviewsLoading = ref(true)

function formatRelativeTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
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

onMounted(async () => {
  try {
    latestFriendReviews.value = await fetchLatestReviews()
  } catch {
    latestFriendReviews.value = []
  } finally {
    reviewsLoading.value = false
  }
})

/** Duplicate list for seamless CSS marquee loop. */
const reviewFeedLoops = [0, 1] as const
const reviewMarqueePaused = ref(false)

function pauseReviewMarquee() {
  reviewMarqueePaused.value = true
}

function resumeReviewMarquee() {
  reviewMarqueePaused.value = false
}

/** The Sommelier currently ends with a preference profile, not whisky picks. */
const sommelierSteps = [
  {
    title: '聊聊你的口味',
    description: '喜歡與不喜歡的風味、泥煤與煙燻、預算，還有今天想喝酒的情境。',
  },
  {
    title: '理解你的偏好',
    description: '侍酒師從對話裡抓出你在意的方向，也記下你想避開的味道。',
  },
  {
    title: '整理偏好輪廓',
    description: '把這次的口味整理成一份偏好輪廓，作為探索下一杯的起點。',
  },
]

function goSearchEntry() {
  // Entry only — full search stays on /whiskies
  void router.push('/whiskies')
}

function goSommelier() {
  void router.push('/sommelier')
}

function goAuctions() {
  void router.push('/auctions')
}
</script>

<template>
  <main class="home">
    <section class="hero" aria-labelledby="home-hero-title">
      <div class="hero-shell">
        <div class="hero-copy">
          <p class="brand"><span class="brand-rule" aria-hidden="true" />WHISKYHELLO</p>
          <h1 id="home-hero-title">
            懂你的口味，<br />
            <span class="hero-accent">幫你找到下一杯威士忌。</span>
          </h1>
        </div>
        <p class="hero-lead">
          從風味、預算與飲酒情境出發，與侍酒師聊聊，找到更適合你的酒款。
        </p>
        <div class="hero-cta">
          <Button
            label="與侍酒師聊聊"
            icon="pi pi-arrow-right"
            icon-pos="right"
            severity="secondary"
            outlined
            @click="goSommelier"
          />
        </div>
      </div>
    </section>

    <div class="luxury-rule" aria-hidden="true" />

    <section class="taste section" aria-labelledby="home-taste-heading">
      <div class="section-inner">
        <p class="eyebrow">Sommelier</p>
        <h2 id="home-taste-heading">別急著找酒，先找到你的口味</h2>
        <p class="section-desc taste-desc">
          從你喜歡的風味出發，探索泥煤、甜香與木質調，與侍酒師一起慢慢描繪出屬於你的口味。
        </p>
        <ol class="capability-list taste-steps">
          <li
            v-for="(step, index) in sommelierSteps"
            :key="step.title"
            class="capability-item"
          >
            <span class="capability-index" aria-hidden="true">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </div>
          </li>
        </ol>
        <div class="taste-cta">
          <Button
            label="與侍酒師聊聊"
            icon="pi pi-arrow-right"
            icon-pos="right"
            severity="secondary"
            outlined
            @click="goSommelier"
          />
        </div>
      </div>
    </section>

    <section class="explore section" aria-labelledby="home-discovery-heading">
      <div class="section-inner explore-grid">
        <div class="left-panel">
          <div class="search-panel">
            <p class="eyebrow">Whisky Discovery</p>
            <h2 id="home-discovery-heading">從一杯酒，慢慢認識自己的口味</h2>
            <p class="section-desc">
              搜尋酒款、閱讀評論，也看看其他酒友正在喝什麼。每一次探索，都讓你更了解自己喜歡的威士忌。
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
        </div>

        <div
          class="reviews-panel"
          @mouseenter="pauseReviewMarquee"
          @mouseleave="resumeReviewMarquee"
          @focusin="pauseReviewMarquee"
          @focusout="resumeReviewMarquee"
        >
          <p class="eyebrow">Friend Reviews</p>
          <h2>酒友最近喝了什麼。</h2>

          <p v-if="reviewsLoading" class="review-state" role="status">
            載入評論中…
          </p>
          <p v-else-if="latestFriendReviews.length === 0" class="review-state">
            目前還沒有評論
          </p>
          <div v-else class="review-marquee" aria-label="酒友最新評論流動列表">
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
                        class="review-title"
                        :to="`/whiskies/${review.whiskyId}`"
                        :tabindex="loopIndex === 0 ? undefined : -1"
                      >
                        {{ review.title }}
                      </RouterLink>
                      <span class="rating">{{ review.rating }} / 100</span>
                    </div>
                    <p class="review-summary">
                      <span class="user">{{ review.authorName || '酒友' }}</span>
                      <span class="dot">·</span>
                      <span class="time">{{ formatRelativeTime(review.createdAt) }}</span>
                      <span class="dot">·</span>
                      <span class="excerpt">{{ review.content }}</span>
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

    <section class="auction section" aria-labelledby="home-auction-heading">
      <div class="section-inner auction-inner">
        <p class="eyebrow">Auction House</p>
        <h2 id="home-auction-heading">發現稀有酒款，也看見威士忌市場</h2>
        <p class="section-desc">
          探索限量、收藏與稀有酒款競標，掌握即時價格、出價與結標結果。
        </p>
        <p class="section-desc">
          從「想喝什麼」到「市場上正在發生什麼」，WhiskyHello 連結你的品味與威士忌市場。
        </p>
        <Button
          label="探索 Auction House"
          icon="pi pi-arrow-right"
          icon-pos="right"
          severity="secondary"
          outlined
          @click="goAuctions"
        />
      </div>
    </section>

    <section class="news section" aria-labelledby="home-news-heading">
      <div class="section-inner">
        <div class="news-header">
          <p class="eyebrow">Whisky News</p>
          <h2 id="home-news-heading">掌握值得關注的威士忌世界</h2>
          <p class="section-desc">
            從酒廠、品牌、新品，到拍賣與市場趨勢，整理全球值得關注的威士忌資訊。
          </p>
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
        <p class="eyebrow sommelier-eyebrow">Next Dram</p>
        <h2>下一杯，喝什麼？</h2>
        <p class="sommelier-lead">
          從你的口味開始，和 WhiskyHello 一起找到下一杯值得探索的威士忌。
        </p>
        <Button
          label="與侍酒師聊聊"
          severity="secondary"
          outlined
          @click="goSommelier"
        />
      </div>
    </section>

    <SiteFooter />
  </main>
</template>

<style scoped>
.home {
  width: 100%;
  overflow-x: clip;
  background: var(--wh-night);
  color: var(--wh-cream);
}

/* ——— Hero ——— */
.hero {
  display: flex;
  align-items: center;
  min-height: min(80vh, 44rem);
  padding: 6rem 1.5rem 5.5rem;
  background:
    radial-gradient(ellipse 42% 62% at 84% 36%, rgba(220, 184, 120, 0.13), transparent 70%),
    radial-gradient(ellipse 55% 85% at 0% 100%, rgba(180, 83, 9, 0.2), transparent 65%),
    linear-gradient(180deg, #0b080b 0%, var(--wh-night) 100%);
  color: var(--wh-cream);
}

.hero-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.4rem;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin: 0 0 1.25rem;
  font-family: var(--font-body);
  font-size: var(--fs-eyebrow);
  font-weight: 600;
  letter-spacing: 0.3em;
  color: var(--wh-gold);
}

.brand-rule {
  width: 2.5rem;
  height: 1px;
  background: var(--wh-gold);
}

.hero h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 5.2vw, 4.25rem);
  font-weight: 600;
  line-height: 1.22;
  letter-spacing: 0.03em;
  color: var(--wh-cream);
}

.hero-accent {
  color: var(--wh-gold-bright);
}

.hero-lead {
  margin: 0;
  max-width: 34rem;
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.85;
  color: var(--wh-mauve);
}

.hero-cta {
  margin-top: 1rem;
}

/* Outlined gold buttons on dark sections */
.hero :deep(.p-button),
.auction :deep(.p-button),
.sommelier :deep(.p-button),
.search-box :deep(.p-button) {
  padding: 0.8rem 1.6rem;
  border: 1px solid rgba(220, 184, 120, 0.55);
  border-radius: 2px;
  background: transparent;
  color: var(--wh-cream);
  letter-spacing: 0.08em !important;
  transition:
    border-color 0.25s ease,
    background 0.25s ease,
    color 0.25s ease;
}

.hero :deep(.p-button:not(:disabled):hover),
.auction :deep(.p-button:not(:disabled):hover),
.sommelier :deep(.p-button:not(:disabled):hover),
.search-box :deep(.p-button:not(:disabled):hover) {
  border-color: var(--wh-gold-bright);
  background: rgba(220, 184, 120, 0.08);
  color: var(--wh-cream);
}

.hero :deep(.p-button-icon),
.auction :deep(.p-button-icon),
.search-box :deep(.p-button-icon) {
  color: var(--wh-gold-bright);
}

.luxury-rule {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(220, 184, 120, 0.08) 18%,
    rgba(220, 184, 120, 0.4) 50%,
    rgba(220, 184, 120, 0.08) 82%,
    transparent 100%
  );
}

/* ——— Shared section rhythm ——— */
.section {
  padding: 6.5rem 1.5rem;
}

.section + .section {
  border-top: 1px solid var(--wh-night-line);
}

.section-inner {
  max-width: 1120px;
  margin: 0 auto;
  width: 100%;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 1.1rem;
  font-family: var(--font-body);
  font-size: var(--fs-eyebrow);
  font-weight: 600;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--wh-gold);
}

.eyebrow::before {
  content: '';
  width: 1.75rem;
  height: 1px;
  background: currentColor;
  opacity: 0.7;
}

.section h2 {
  margin: 0 0 1.1rem;
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 2.8vw, 2.35rem);
  font-weight: 600;
  line-height: 1.32;
  letter-spacing: 0.02em;
  color: var(--wh-cream);
}

.section-desc {
  max-width: 38rem;
  margin: 0 0 1.5rem;
  font-family: var(--font-body);
  color: var(--wh-mauve);
  line-height: 1.85;
}

/* ——— Sommelier: 01 / 02 / 03 flow ——— */
.taste {
  background: var(--wh-night);
}

.taste-steps {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  margin-top: 3rem;
  width: 100%;
}

.capability-list {
  list-style: none;
  padding: 0;
}

.capability-item {
  position: relative;
  display: grid;
  grid-template-columns: 4rem minmax(0, 1fr);
  gap: 0.25rem 1.25rem;
  padding: 1.75rem 0;
  border-top: 1px solid var(--wh-night-line);
  min-width: 0;
}

.capability-item::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 0;
  width: 2.5rem;
  height: 1px;
  background: var(--wh-gold);
}

.capability-index {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.02em;
  color: var(--wh-gold);
}

.capability-item h3 {
  margin: 0 0 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.04em;
  color: var(--wh-cream);
}

.capability-item p {
  margin: 0;
  font-family: var(--font-body);
  color: var(--wh-mauve);
  line-height: 1.8;
  font-size: 0.9375rem;
}

.taste-cta {
  margin-top: 2.75rem;
}

.taste-cta :deep(.p-button) {
  padding: 0.85rem 1.75rem;
  border: 1px solid var(--wh-gold-bright);
  border-radius: 2px;
  background: var(--wh-gold-bright);
  color: #1a1216;
  letter-spacing: 0.08em !important;
  transition:
    background 0.25s ease,
    border-color 0.25s ease;
}

.taste-cta :deep(.p-button:not(:disabled):hover) {
  border-color: #e8c98f;
  background: #e8c98f;
  color: #1a1216;
}

.taste-cta :deep(.p-button-icon) {
  color: #1a1216;
  transition: transform 0.25s ease;
}

.taste-cta :deep(.p-button:hover .p-button-icon) {
  transform: translateX(3px);
}

/* ——— Discovery + Reviews ——— */
.explore {
  background: var(--wh-night-raised);
}

.explore-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
  align-items: start;
  width: 100%;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  min-width: 0;
}

.search-panel .section-desc {
  margin-bottom: 1.75rem;
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

/* InputText renders the <input> itself, so the class lands on the input element. */
.search-input.p-inputtext {
  padding: 0.75rem 0.95rem;
  border: 1px solid rgba(241, 233, 220, 0.18);
  border-radius: 2px;
  background: rgba(241, 233, 220, 0.03);
  color: var(--wh-cream);
  box-shadow: none;
}

.search-input.p-inputtext::placeholder {
  color: var(--wh-mauve);
  opacity: 1;
}

.search-input.p-inputtext:enabled:hover {
  border-color: rgba(241, 233, 220, 0.3);
}

.search-input.p-inputtext:enabled:focus {
  border-color: var(--wh-gold);
  box-shadow: none;
}

.reviews-panel {
  min-width: 0;
  padding-top: 2.5rem;
  border-top: 1px solid var(--wh-night-line);
}

.review-marquee {
  position: relative;
  width: 100%;
  min-width: 0;
}

.review-marquee-viewport {
  height: 22rem;
  overflow: hidden;
  border-top: 1px solid var(--wh-night-line);
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
  padding: 0.95rem 0;
  border-bottom: 1px solid var(--wh-night-line);
  min-width: 0;
}

.review-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.review-state {
  margin: 0;
  padding: 1rem 0;
  border-top: 1px solid var(--wh-night-line);
  font-family: var(--font-body);
  color: var(--wh-mauve);
  font-size: 0.875rem;
}

.review-title {
  min-width: 0;
  font-family: var(--font-body);
  color: var(--wh-cream);
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.review-title:hover {
  color: var(--wh-gold-bright);
}

.rating {
  flex-shrink: 0;
  font-family: var(--font-body);
  color: var(--wh-gold-bright);
  font-size: 0.8125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.review-summary {
  margin: 0.3rem 0 0.25rem;
  font-family: var(--font-body);
  color: var(--wh-mauve);
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.55;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-summary .dot {
  margin: 0 0.28rem;
}

.review-summary .excerpt {
  color: #c9bdc5;
}

.review-link {
  font-family: var(--font-body);
  color: var(--wh-gold);
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-decoration: none;
}

.review-link:hover {
  color: var(--wh-gold-bright);
}

/* ——— Auction ——— */
.auction {
  background:
    radial-gradient(ellipse 45% 90% at 100% 50%, rgba(180, 83, 9, 0.18), transparent 70%),
    var(--wh-night);
}

.auction-inner .section-desc + .section-desc {
  margin-top: -0.6rem;
}

.auction-inner :deep(.p-button) {
  margin-top: 0.75rem;
}

/* ——— News ——— */
.news {
  background: var(--wh-night-raised);
}

.news-header {
  margin-bottom: 2.5rem;
}

.news-header .section-desc {
  margin-bottom: 0;
}

.news-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

.news-side {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

/* ——— Closing CTA ——— */
.sommelier {
  padding-top: 7rem;
  padding-bottom: 7rem;
  background:
    radial-gradient(ellipse 60% 100% at 50% 100%, rgba(180, 83, 9, 0.22), transparent 70%),
    var(--wh-night);
  color: var(--wh-cream);
}

.sommelier-inner {
  max-width: 36rem;
  width: 100%;
  text-align: center;
}

.sommelier-inner .eyebrow {
  justify-content: center;
}

.sommelier-lead {
  margin: 0 0 2rem;
  font-family: var(--font-body);
  color: var(--wh-mauve);
  line-height: 1.85;
  font-weight: 400;
}

@media (prefers-reduced-motion: reduce) {
  .review-marquee-track {
    animation: none;
  }

  .hero :deep(.p-button),
  .auction :deep(.p-button),
  .sommelier :deep(.p-button),
  .search-box :deep(.p-button),
  .taste-cta :deep(.p-button),
  .taste-cta :deep(.p-button-icon),
  .review-title {
    transition: none;
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

@media (max-width: 640px) {
  .hero {
    min-height: 0;
    padding: 4.5rem 1.25rem 4rem;
  }

  .brand {
    margin-bottom: 0.75rem;
  }

  .hero h1 {
    font-size: clamp(1.75rem, 7.6vw, 2.25rem);
  }

  .hero-lead {
    font-size: 0.9375rem;
    line-height: 1.75;
  }

  .section {
    padding: 4.25rem 1.25rem;
  }

  .sommelier {
    padding-top: 4.75rem;
    padding-bottom: 4.75rem;
  }

  .taste-steps {
    margin-top: 2.25rem;
  }

  .capability-item {
    grid-template-columns: 3.25rem minmax(0, 1fr);
    gap: 0.25rem 1rem;
    padding: 1.5rem 0;
  }

  .capability-index {
    font-size: 2rem;
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
    gap: 2.5rem 4rem;
  }

  .reviews-panel {
    padding-top: 0;
    padding-left: 3rem;
    border-top: none;
    border-left: 1px solid var(--wh-night-line);
  }

  .taste-steps {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0 3rem;
  }

  .capability-item {
    grid-template-columns: 1fr;
    gap: 1.25rem;
    padding: 2rem 0 0;
  }

  .capability-index {
    font-size: clamp(2.75rem, 4.2vw, 3.75rem);
  }

  .review-marquee-viewport {
    height: 26rem;
  }

  .news-layout {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    gap: 1.5rem;
    align-items: stretch;
  }

  .news-side {
    gap: 1.5rem;
  }
}
</style>
