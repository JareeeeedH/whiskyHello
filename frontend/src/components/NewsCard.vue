<script setup lang="ts">
import { computed } from 'vue'
import type { WhiskyNews } from '../types/news'
import { formatRelativeTime } from '../utils/relativeTime'

const props = withDefaults(
  defineProps<{
    item: WhiskyNews
    featured?: boolean
  }>(),
  { featured: false },
)

const relativeTime = computed(() => formatRelativeTime(props.item.publishedAt))

const categoryLabel: Record<WhiskyNews['category'], string> = {
  news: 'News',
  release: 'Release',
  industry: 'Industry',
  distillery: 'Distillery',
  community: 'Community',
}
</script>

<template>
  <a
    class="news-card"
    :class="{ featured }"
    :href="item.url"
    target="_blank"
    rel="noopener noreferrer"
  >
    <div class="media">
      <img
        v-if="item.imageUrl"
        :src="item.imageUrl"
        :alt="item.title"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
      <div v-else class="media-fallback" aria-hidden="true">No image</div>
    </div>
    <div class="body">
      <div class="meta">
        <span class="source">{{ item.source }}</span>
        <span class="category">{{ categoryLabel[item.category] }}</span>
      </div>
      <h3 class="title">{{ item.title }}</h3>
      <time class="time" :datetime="item.publishedAt">{{ relativeTime }}</time>
    </div>
  </a>
</template>

<style scoped>
.news-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  color: inherit;
  text-decoration: none;
  border: 1px solid #e7e5e4;
  background: #fff;
  overflow: hidden;
  transition:
    border-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.news-card:hover {
  border-color: #d6d3d1;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(28, 25, 23, 0.06);
}

.news-card:focus-visible {
  outline: 2px solid #b45309;
  outline-offset: 2px;
}

.media {
  position: relative;
  aspect-ratio: 16 / 10;
  background: #f5f5f4;
  overflow: hidden;
}

.featured .media {
  aspect-ratio: 16 / 9;
}

.media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.media-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #a8a29e;
  font-size: 0.8125rem;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.9rem 1rem 1.05rem;
  flex: 1;
}

.featured .body {
  padding: 1.05rem 1.15rem 1.2rem;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
}

.source {
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #b45309;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category {
  flex-shrink: 0;
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #a8a29e;
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: normal;
  color: #1c1917;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.featured .title {
  font-size: 1.2rem;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.time {
  margin-top: auto;
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 400;
  color: #78716c;
}
</style>
