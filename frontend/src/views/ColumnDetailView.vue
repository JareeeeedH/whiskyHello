<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ColumnBody from '../components/ColumnBody.vue'
import ColumnCard from '../components/ColumnCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import {
  COLUMN_TYPE_LABELS,
  formatColumnDate,
  getColumnById,
  getRelatedColumns,
} from '../data/columns'
import { applyPageMeta } from '../utils/applyPageMeta'
import { NOT_FOUND_META, columnPageMeta } from '../utils/pageMeta'

const route = useRoute()

const column = computed(() => getColumnById(String(route.params.id ?? '')))
const related = computed(() => (column.value ? getRelatedColumns(column.value, 3) : []))

// The route has no static seo meta; it depends on which article was found.
watch(
  column,
  (current) => {
    if (route.name !== 'column-detail') return
    applyPageMeta(current ? columnPageMeta(current) : NOT_FOUND_META, route.path)
  },
  { immediate: true },
)

/** Covers are linked from other sites and may disappear; hide the figure then. */
const coverFailed = ref(false)
watch(column, () => {
  coverFailed.value = false
})
</script>

<template>
  <main class="column-detail">
    <article v-if="column" class="article">
      <p class="back">
        <RouterLink to="/columns">← 威士忌專欄</RouterLink>
      </p>

      <header class="article-header">
        <span class="type">{{ COLUMN_TYPE_LABELS[column.type] }}</span>
        <h1>{{ column.title }}</h1>
        <p class="meta">
          <time :datetime="column.publishedAt">{{ formatColumnDate(column.publishedAt) }}</time>
          <span>閱讀約 {{ column.readingMinutes }} 分鐘</span>
        </p>
      </header>

      <figure v-if="column.cover && !coverFailed" class="cover">
        <img :src="column.cover.imageUrl" :alt="column.title" @error="coverFailed = true" />
        <figcaption>
          圖片來源：<a :href="column.cover.sourceUrl" target="_blank" rel="noopener noreferrer">{{
            column.cover.credit
          }}</a>
        </figcaption>
      </figure>

      <ColumnBody :blocks="column.body" />

      <details v-if="column.sources.length > 0" class="sources">
        <summary>資料來源（{{ column.sources.length }}）</summary>
        <ol>
          <li v-for="source in column.sources" :key="source.url">
            <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}</a>
          </li>
        </ol>
      </details>
    </article>

    <section v-else class="not-found">
      <h1>找不到這篇文章</h1>
      <p>這篇文章不存在或已移除，看看其他專欄文章吧。</p>
      <RouterLink to="/columns">← 威士忌專欄</RouterLink>
    </section>

    <section v-if="related.length > 0" class="related" aria-labelledby="related-title">
      <div class="related-inner">
        <h2 id="related-title">延伸閱讀</h2>
        <div class="related-grid">
          <ColumnCard v-for="item in related" :key="item.id" :column="item" />
        </div>
      </div>
    </section>

    <SiteFooter />
  </main>
</template>

<style scoped>
.column-detail {
  width: 100%;
  overflow-x: clip;
  background: var(--wh-paper);
  color: var(--wh-ink);
}

.article,
.not-found {
  max-width: 42rem;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 3.5rem;
}

.back {
  margin: 0 0 1.75rem;
  font-size: var(--fs-body-sm);
}

.back a,
.not-found a {
  color: var(--wh-amber);
  text-decoration: none;
}

.back a:hover,
.not-found a:hover {
  text-decoration: underline;
}

.type {
  font-size: var(--fs-meta);
  font-weight: var(--fw-emphasis);
  letter-spacing: 0.06em;
  color: var(--wh-amber);
}

.article-header h1 {
  margin: 0.5rem 0 0.85rem;
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 4.2vw, 2.4rem);
  font-weight: var(--fw-display);
  line-height: 1.35;
  color: var(--wh-ink);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0 1rem;
  margin: 0;
  font-size: var(--fs-meta);
  color: var(--wh-muted);
}

.cover {
  margin: 2rem 0 2.25rem;
}

.cover img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  background: #efebe6;
}

.cover figcaption {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--wh-faint);
}

.cover figcaption a {
  color: inherit;
}

.sources {
  margin-top: 3rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--wh-line);
}

.sources summary {
  width: fit-content;
  font-size: var(--fs-body-sm);
  color: var(--wh-muted);
  cursor: pointer;
}

.sources summary:hover {
  color: var(--wh-amber);
}

.sources summary:focus-visible {
  outline: 2px solid var(--wh-gold);
  outline-offset: 2px;
}

.sources ol {
  margin: 0.85rem 0 0;
  padding-left: 1.4rem;
  font-size: var(--fs-meta);
  line-height: 1.7;
  color: var(--wh-muted);
}

.sources li {
  margin-bottom: 0.4rem;
  overflow-wrap: anywhere;
}

.sources a {
  color: inherit;
}

.sources a:hover {
  color: var(--wh-amber);
}

.not-found h1 {
  margin: 1rem 0 0.75rem;
  font-family: var(--font-display);
  font-size: var(--fs-h1);
}

.not-found p {
  margin: 0 0 1rem;
  color: var(--wh-muted);
}

.related {
  padding: 3rem 1.5rem 4.5rem;
  border-top: 1px solid var(--wh-line);
  background: #f5f2ee;
}

.related-inner {
  max-width: 1120px;
  margin: 0 auto;
}

.related h2 {
  margin: 0 0 1.5rem;
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-display);
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  gap: 1.5rem;
}

@media (max-width: 640px) {
  .article,
  .not-found {
    padding: 1.25rem 1.25rem 2.75rem;
  }

  .related {
    padding: 2.25rem 1.25rem 3.5rem;
  }
}
</style>
