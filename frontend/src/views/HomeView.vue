<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import Button from 'primevue/button'
import ColumnCard from '../components/ColumnCard.vue'
import NewsCard from '../components/NewsCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import WhiskyDrop from '../components/WhiskyDrop.vue'
import { getColumns } from '../data/columns'
import { getRandomNews } from '../data/news'

const router = useRouter()

/** Homepage news feed — swap getRandomNews for API later. */
const newsItems = getRandomNews(5)
const featuredNews = computed(() => newsItems[0])
const sideNews = computed(() => newsItems.slice(1))

/** Newest 3 columns: one featured, two beside it. */
const latestColumns = getColumns().slice(0, 3)
const featuredColumn = latestColumns[0]
const sideColumns = latestColumns.slice(1)

function goSommelier() {
  void router.push('/sommelier')
}
</script>

<template>
  <main class="home">
    <section class="hero" aria-labelledby="home-hero-title">
      <div class="hero-shell">
        <div class="hero-copy">
          <h1 id="home-hero-title">
            懂你的口味，<br />
            幫你找到下一杯威士忌。
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

    <section v-if="featuredColumn" class="columns section" aria-labelledby="home-columns-heading">
      <div class="section-inner">
        <div class="columns-header">
          <div>
            <h2 id="home-columns-heading">威士忌，一篇就懂</h2>
            <p class="section-desc">從酒標、木桶到喝法，用好讀的文章認識威士忌。</p>
          </div>
          <RouterLink to="/columns" class="columns-all">看全部專欄</RouterLink>
        </div>

        <div class="columns-layout">
          <ColumnCard :column="featuredColumn" featured tone="night" />
          <div v-if="sideColumns.length > 0" class="columns-side">
            <ColumnCard
              v-for="column in sideColumns"
              :key="column.id"
              :column="column"
              tone="night"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="news section" aria-labelledby="home-news-heading">
      <div class="section-inner">
        <div class="news-header">
          <h2 id="home-news-heading">掌握值得關注的威士忌世界</h2>
          <p class="section-desc">
            從酒廠、品牌、新品，到市場趨勢，整理全球值得關注的威士忌資訊。
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
      <WhiskyDrop />
      <div class="section-inner sommelier-inner">
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
  min-height: min(64vh, 35rem);
  padding: 4.8rem 1.5rem 4.4rem;
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

.hero h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 5.2vw, 4.25rem);
  font-weight: 600;
  line-height: 1.22;
  letter-spacing: 0.03em;
  color: var(--wh-cream);
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
.sommelier :deep(.p-button) {
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

.sommelier :deep(.p-button:not(:disabled):hover) {
  border-color: var(--wh-gold-bright);
  background: rgba(220, 184, 120, 0.08);
  color: var(--wh-cream);
}

.hero :deep(.p-button-icon) {
  color: var(--wh-gold-bright);
}

/* Hero: whisky rises from the bottom of the glass on hover */
.hero :deep(.p-button) {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  background: rgba(220, 184, 120, 0.03);
  transition:
    border-color 0.7s ease,
    color 0.45s ease 0.25s,
    letter-spacing 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

.hero :deep(.p-button)::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-top: 1px solid rgba(255, 240, 210, 0.75);
  background: linear-gradient(to top, #a8792c 0%, #d4ae6a 55%, #ecd29c 100%);
  transform: translateY(102%);
  transition: transform 1s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.hero :deep(.p-button:not(:disabled):hover) {
  border-color: #ecd29c;
  background: rgba(220, 184, 120, 0.03);
  color: #1a1216;
  letter-spacing: 0.12em !important;
}

.hero :deep(.p-button:not(:disabled):hover)::before {
  transform: translateY(0);
}

.hero :deep(.p-button-icon) {
  transition:
    color 0.45s ease 0.25s,
    transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.hero :deep(.p-button:not(:disabled):hover .p-button-icon) {
  color: #1a1216;
  transform: translateX(4px);
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

/* ——— Columns ——— */
.columns-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem 2rem;
  margin-bottom: 2.5rem;
}

.columns-header .section-desc {
  margin-bottom: 0;
}

.columns-all {
  flex-shrink: 0;
  font-family: var(--font-body);
  font-size: var(--fs-body-sm);
  color: var(--wh-gold);
  text-decoration: none;
  border-bottom: 1px solid rgba(201, 164, 106, 0.4);
  padding-bottom: 0.15rem;
}

.columns-all:hover {
  color: var(--wh-gold-bright);
  border-bottom-color: var(--wh-gold-bright);
}

.columns-all:focus-visible {
  outline: 2px solid var(--wh-gold);
  outline-offset: 3px;
}

.columns-layout,
.columns-side {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

/* ——— Closing CTA ——— */
.sommelier {
  position: relative;
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

.sommelier-lead {
  margin: 0 0 2rem;
  font-family: var(--font-body);
  color: var(--wh-mauve);
  line-height: 1.85;
  font-weight: 400;
}

@media (prefers-reduced-motion: reduce) {
  .hero :deep(.p-button),
  .sommelier :deep(.p-button),
  .hero :deep(.p-button-icon) {
    transition: none;
  }

  .hero :deep(.p-button)::before {
    transition: none;
  }
}

@media (max-width: 640px) {
  .hero {
    min-height: 0;
    padding: 3.6rem 1.25rem 3.2rem;
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

  .sommelier :deep(.p-button) {
    width: 100%;
    white-space: normal;
    line-height: 1.35;
  }
}

@media (min-width: 801px) {
  .news-layout {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1.5rem;
    align-items: stretch;
  }

  /* 4 side items in a 2×2 grid */
  .news-side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem;
  }

  /* Columns: a wider featured card, two cards stacked beside it */
  .columns-layout {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 1.5rem;
    align-items: stretch;
  }

  .columns-side {
    gap: 1.5rem;
  }
}

@media (min-width: 801px) {
  /* Side cards sit image-left so two of them match the featured card's height. */
  .columns-side :deep(.column-card) {
    flex-direction: row;
  }

  .columns-side :deep(.column-card .media) {
    flex: 0 0 42%;
    aspect-ratio: auto;
    min-height: 9rem;
  }
}
</style>
