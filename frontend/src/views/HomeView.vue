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
  color: #1c1917;
  width: 100%;
  overflow-x: clip;
}

.hero {
  background:
    radial-gradient(ellipse 60% 120% at 0% 0%, rgba(180, 83, 9, 0.16), transparent 60%),
    #161311;
  color: var(--wh-paper);
  padding: 2.5rem 1.5rem;
}

.hero-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.9rem;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0 0.85rem;
  font-family: var(--font-body);
  font-size: var(--fs-eyebrow);
  font-weight: 600;
  letter-spacing: 0.22em;
  color: var(--wh-gold);
}

.brand-rule {
  width: 1.5rem;
  height: 1px;
  background: var(--wh-gold);
}

.hero h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-hero);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.02em;
}

.hero-accent {
  color: #e7bd73;
}

.hero-lead {
  margin: 0;
  max-width: 32rem;
  font-family: var(--font-body);
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--wh-faint);
}

.hero-cta {
  margin-top: 0.35rem;
}

.hero :deep(.p-button),
.sommelier :deep(.p-button) {
  color: #fafaf9;
  border-color: rgba(231, 189, 115, 0.6);
}

.hero :deep(.p-button:hover),
.sommelier :deep(.p-button:hover) {
  color: #fafaf9;
  border-color: #e7bd73;
  background: rgba(231, 189, 115, 0.12);
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
  font-family: var(--font-body);
  font-size: var(--fs-eyebrow);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #a8a29e;
}

.section h2 {
  margin: 0 0 0.85rem;
  font-family: var(--font-display);
  font-size: var(--fs-h2);
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: normal;
}

.section-desc {
  margin: 0 0 1.35rem;
  font-family: var(--font-body);
  color: #57534e;
  line-height: 1.75;
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

/* InputText renders the <input> itself, so the class lands on the input element. */
.search-input.p-inputtext {
  background: #fff;
  color: var(--wh-ink);
  border-color: var(--p-inputtext-border-color);
}

.search-input.p-inputtext::placeholder {
  color: var(--wh-muted);
  opacity: 1;
}

.search-input.p-inputtext:enabled:hover {
  border-color: var(--p-inputtext-hover-border-color);
}

.search-input.p-inputtext:enabled:focus {
  border-color: var(--p-inputtext-focus-border-color);
}

.search-box :deep(.p-button) {
  border: 1px solid rgba(161, 98, 7, 0.45);
  background: #fff;
  color: #7a4310;
  font-weight: 600;
  letter-spacing: 0.04em;
  transition:
    border-color 0.25s ease,
    background 0.25s ease,
    box-shadow 0.25s ease;
}

.search-box :deep(.p-button:not(:disabled):hover) {
  border-color: #a16207;
  background: #fbf3e4;
  color: #5c320c;
  box-shadow: 0 0 0 3px rgba(201, 164, 106, 0.16);
}

.search-box :deep(.p-button-icon) {
  color: #a16207;
}

.search-panel .section-desc {
  margin-bottom: 1.1rem;
}

.reviews-panel {
  min-width: 0;
  padding-top: 1.75rem;
  border-top: 1px solid rgba(180, 83, 9, 0.18);
}

.reviews-panel .section-desc {
  margin-bottom: 0.85rem;
}

.taste,
.auction {
  background: #fff;
}

.taste-desc,
.auction-inner .section-desc,
.news-header .section-desc {
  max-width: 40rem;
}

.auction-inner .section-desc + .section-desc {
  margin-top: -0.6rem;
}

.taste-cta {
  margin-top: 1.75rem;
}

.taste-cta :deep(.p-button) {
  position: relative;
  overflow: hidden;
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(161, 98, 7, 0.4);
  background: linear-gradient(120deg, #f7e9cb 0%, #ebcb8f 50%, #dcae66 100%);
  color: #3b2410;
  font-weight: 600;
  letter-spacing: 0.06em;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.6),
    0 10px 24px -12px rgba(161, 98, 7, 0.5);
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

/* Light sweeping across the glass on hover. */
.taste-cta :deep(.p-button)::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 30%,
    rgba(255, 255, 255, 0.6) 50%,
    transparent 70%
  );
  transform: translateX(-120%);
  transition: transform 0.8s ease;
  pointer-events: none;
}

.taste-cta :deep(.p-button:not(:disabled):hover) {
  border-color: #a16207;
  background: linear-gradient(120deg, #f7e9cb 0%, #ebcb8f 50%, #dcae66 100%);
  color: #2b1a0c;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 0 0 4px rgba(201, 164, 106, 0.2),
    0 14px 30px -12px rgba(161, 98, 7, 0.6);
}

.taste-cta :deep(.p-button:hover)::after {
  transform: translateX(120%);
}

.taste-cta :deep(.p-button-icon) {
  color: #8a4b12;
  transition: transform 0.25s ease;
}

.taste-cta :deep(.p-button:hover .p-button-icon) {
  transform: translateX(3px);
}

.news {
  background: #fafaf9;
}

.news-header {
  margin-bottom: 1.5rem;
}

.news-header .section-desc {
  margin-bottom: 0;
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

.taste-steps {
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
  font-family: var(--font-body);
  color: #b45309;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1.6;
}

.capability-item h3 {
  margin: 0 0 0.3rem;
  font-family: var(--font-body);
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.35;
}

.capability-item p {
  margin: 0;
  font-family: var(--font-body);
  color: #57534e;
  line-height: 1.65;
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

.review-state {
  margin: 0;
  padding: 1rem 0;
  border-top: 1px solid #e7e5e4;
  font-family: var(--font-body);
  color: #78716c;
  font-size: 0.875rem;
}

.review-title {
  min-width: 0;
  font-family: var(--font-body);
  color: #1c1917;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-title:hover {
  color: #b45309;
  text-decoration: underline;
}

.rating {
  flex-shrink: 0;
  font-family: var(--font-body);
  color: #b45309;
  font-size: 0.8125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.review-summary {
  margin: 0.25rem 0 0.2rem;
  font-family: var(--font-body);
  color: #78716c;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.5;
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
  font-family: var(--font-body);
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

  .taste-cta :deep(.p-button),
  .taste-cta :deep(.p-button-icon),
  .search-box :deep(.p-button) {
    transition: none;
  }

  .taste-cta :deep(.p-button)::after {
    display: none;
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
  font-family: var(--font-display);
  font-weight: 600;
  color: #fafaf9;
}

.sommelier-lead {
  margin: 0 0 1.5rem;
  font-family: var(--font-body);
  color: #d6d3d1;
  line-height: 1.75;
  font-weight: 400;
}

@media (max-width: 640px) {
  .hero {
    padding: 1.75rem 1rem 1.6rem;
  }

  .brand {
    margin-bottom: 0.65rem;
  }

  .hero-lead {
    font-size: 0.875rem;
    line-height: 1.6;
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

  .taste-steps {
    grid-template-columns: repeat(3, minmax(0, 1fr));
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
