<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { COLUMN_TYPE_LABELS } from '../data/columns'
import type { WhiskyColumn } from '../types/column'

withDefaults(
  defineProps<{
    column: WhiskyColumn
    /** Featured cards are larger and show the description. */
    featured?: boolean
    /** night = homepage dark sections, paper = light reading pages. */
    tone?: 'night' | 'paper'
  }>(),
  { featured: false, tone: 'paper' },
)

/** Covers are linked from other sites and may disappear. */
const imageFailed = ref(false)
const brandLogoSrc = `${import.meta.env.BASE_URL}favicon.svg`
</script>

<template>
  <RouterLink
    class="column-card"
    :class="[`tone-${tone}`, { featured }]"
    :to="`/columns/${column.id}`"
  >
    <div class="media">
      <img
        v-if="column.cover && !imageFailed"
        :src="column.cover.imageUrl"
        alt=""
        loading="lazy"
        @error="imageFailed = true"
      />
      <div v-else class="media-fallback" aria-hidden="true">
        <img :src="brandLogoSrc" alt="" />
      </div>
    </div>
    <div class="body">
      <span class="type">{{ COLUMN_TYPE_LABELS[column.type] }}</span>
      <h3 class="title">{{ column.title }}</h3>
      <p v-if="featured" class="description">{{ column.description }}</p>
    </div>
  </RouterLink>
</template>

<style scoped>
.column-card {
  --card-line: var(--wh-line);
  --card-line-hover: rgba(161, 98, 7, 0.35);
  --card-title: var(--wh-ink);
  --card-muted: var(--wh-muted);
  --card-label: var(--wh-amber);
  --card-media: #efebe6;

  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  color: inherit;
  text-decoration: none;
  border: 1px solid var(--card-line);
  overflow: hidden;
  transition: border-color 0.25s ease;
}

.tone-night {
  --card-line: var(--wh-night-line);
  --card-line-hover: rgba(220, 184, 120, 0.4);
  --card-title: var(--wh-cream);
  --card-muted: var(--wh-mauve);
  --card-label: var(--wh-gold);
  --card-media: #1d171d;
}

.tone-paper {
  background: #fffdf9;
}

.column-card:hover {
  border-color: var(--card-line-hover);
}

.column-card:focus-visible {
  outline: 2px solid var(--wh-gold);
  outline-offset: 2px;
}

.media {
  position: relative;
  aspect-ratio: 16 / 10;
  background: var(--card-media);
  overflow: hidden;
}

.featured .media {
  aspect-ratio: 16 / 9;
}

.media > img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-fallback img {
  width: 2rem;
  height: 2rem;
  opacity: 0.6;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1rem 1.1rem 1.2rem;
  flex: 1;
}

.featured .body {
  padding: 1.3rem 1.4rem 1.5rem;
}

.type {
  font-family: var(--font-body);
  font-size: var(--fs-meta);
  font-weight: var(--fw-emphasis);
  letter-spacing: 0.06em;
  color: var(--card-label);
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.5;
  color: var(--card-title);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.featured .title {
  font-size: clamp(1.25rem, 2vw, 1.5rem);
  line-height: 1.4;
}

.description {
  margin: 0.15rem 0 0;
  font-family: var(--font-body);
  font-size: var(--fs-body-sm);
  line-height: 1.8;
  color: var(--card-muted);
}

@media (min-width: 801px) {
  /* The featured card fills the height of the two stacked cards beside it. */
  .featured .media {
    flex: 1 1 0;
    aspect-ratio: auto;
    min-height: 15rem;
  }

  .featured .media > img {
    position: absolute;
    inset: 0;
  }

  .featured .body {
    flex: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .column-card {
    transition: none;
  }
}
</style>
