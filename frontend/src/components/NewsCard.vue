<script setup lang="ts">
import { computed, ref } from 'vue'
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
const imageFailed = ref(false)
const brandLogoSrc = `${import.meta.env.BASE_URL}favicon.svg`

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
        v-if="item.imageUrl && !imageFailed"
        :src="item.imageUrl"
        :alt="item.title"
        loading="lazy"
        referrerpolicy="no-referrer"
        @error="imageFailed = true"
      />
      <div v-else class="media-fallback" aria-hidden="true">
        <img class="fallback-logo" :src="brandLogoSrc" alt="" />
        <span class="fallback-name">WhiskyHello</span>
      </div>
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
  border: 1px solid var(--wh-night-line);
  background: transparent;
  overflow: hidden;
  transition: border-color 0.25s ease;
}

.news-card:hover {
  border-color: rgba(220, 184, 120, 0.4);
}

.news-card:focus-visible {
  outline: 2px solid var(--wh-gold);
  outline-offset: 2px;
}

.media {
  position: relative;
  aspect-ratio: 16 / 10;
  background: #1d171d;
  overflow: hidden;
}

.media::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(17, 13, 17, 0.28) 0%, rgba(17, 13, 17, 0.72) 100%);
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.news-card:hover .media::after {
  opacity: 0.6;
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
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background: radial-gradient(ellipse at center, rgba(220, 184, 120, 0.08), transparent 70%), #1d171d;
  color: var(--wh-mauve);
}

.media .media-fallback .fallback-logo {
  position: static;
  width: 2rem;
  height: 2rem;
  opacity: 0.75;
}

.fallback-name {
  font-family: var(--font-display);
  font-size: 0.875rem;
  letter-spacing: 0.08em;
  opacity: 0.9;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 1.1rem 1.15rem;
  flex: 1;
}

.featured .body {
  padding: 1.25rem 1.35rem 1.4rem;
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
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--wh-gold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category {
  flex-shrink: 0;
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--wh-mauve);
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.45;
  letter-spacing: 0.01em;
  color: var(--wh-cream);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.featured .title {
  font-size: 1.3rem;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.time {
  margin-top: auto;
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--wh-mauve);
}

@media (min-width: 801px) {
  .featured .media {
    flex: 1 1 0;
    aspect-ratio: auto;
    min-height: 16rem;
  }

  .featured .media img {
    position: absolute;
    inset: 0;
  }

  .featured .body {
    flex: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .news-card,
  .media::after {
    transition: none;
  }
}
</style>
