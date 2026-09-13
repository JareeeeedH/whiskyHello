<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Whisky } from '../types/whisky'

defineProps<{
  whisky: Whisky
}>()
</script>

<template>
  <RouterLink :to="`/whiskies/${whisky.id}`" class="whisky-card">
    <div class="image-wrap">
      <img
        v-if="whisky.imageUrl"
        :src="whisky.imageUrl"
        :alt="whisky.name"
        loading="lazy"
      />
      <div v-else class="image-fallback" aria-hidden="true">No image</div>
    </div>
    <div class="body">
      <h3 class="name">{{ whisky.name }}</h3>
      <p v-if="whisky.subtitle" class="subtitle">{{ whisky.subtitle }}</p>
      <p class="score-line">
        <span v-if="whisky.points !== undefined" class="points">
          {{ whisky.points }}
          <span class="points-unit">points</span>
        </span>
        <span v-else-if="whisky.score" class="score-text">{{ whisky.score }}</span>
        <span v-else class="score-empty">—</span>
      </p>
    </div>
  </RouterLink>
</template>

<style scoped>
.whisky-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: inherit;
  text-decoration: none;
  border: 1px solid rgba(231, 229, 228, 0.95);
  background: #fff;
  overflow: hidden;
  transition:
    border-color 0.28s ease,
    transform 0.28s ease,
    box-shadow 0.28s ease;
}

.whisky-card:hover {
  border-color: rgba(217, 119, 6, 0.45);
  transform: translateY(-3px);
  box-shadow:
    0 0 0 1px rgba(251, 191, 36, 0.12),
    0 14px 28px rgba(28, 25, 23, 0.08);
}

.whisky-card:focus-visible {
  outline: 2px solid #b45309;
  outline-offset: 2px;
}

.image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  flex-shrink: 0;
  padding: 0.85rem;
  background:
    radial-gradient(ellipse at 50% 35%, #fff 0%, #f5f5f4 55%, #ebe8e4 100%);
  border-bottom: 1px solid rgba(180, 83, 9, 0.08);
}

.image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.35s ease;
}

.whisky-card:hover .image-wrap img {
  transform: scale(1.04);
}

.image-fallback {
  color: #a8a29e;
  font-size: 0.8125rem;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.85rem 0.85rem 0.95rem;
  flex: 1;
}

.name {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.35;
  color: #1c1917;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.subtitle {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: #78716c;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.score-line {
  margin: auto 0 0;
  padding-top: 0.55rem;
}

.points {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1;
  color: #b45309;
}

.points-unit {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #a16207;
}

.score-text {
  font-size: 0.875rem;
  font-weight: 700;
  color: #b45309;
}

.score-empty {
  color: #a8a29e;
}

@media (max-width: 640px) {
  .image-wrap {
    height: 150px;
    padding: 0.65rem;
  }

  .body {
    padding: 0.7rem;
  }

  .name {
    font-size: 0.85rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .whisky-card,
  .image-wrap img {
    transition: none;
  }

  .whisky-card:hover {
    transform: none;
  }

  .whisky-card:hover .image-wrap img {
    transform: none;
  }
}
</style>
