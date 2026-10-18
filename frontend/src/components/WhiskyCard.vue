<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { Whisky } from '../types/whisky'

const props = defineProps<{
  whisky: Whisky
}>()

const imageFailed = ref(false)
watch(() => props.whisky.imageUrl, () => { imageFailed.value = false })
</script>

<template>
  <RouterLink :to="`/whiskies/${whisky.id}`" class="whisky-card">
    <div class="image-wrap">
      <img
        v-if="whisky.imageUrl && !imageFailed"
        :src="whisky.imageUrl"
        :alt="whisky.name"
        loading="lazy"
        @error="imageFailed = true"
      />
      <div v-else class="image-fallback" aria-hidden="true">No image</div>
    </div>
    <div class="body">
      <p
        class="score-line"
        :class="{ 'is-top': whisky.points !== undefined && whisky.points >= 90 }"
      >
        <template v-if="whisky.points !== undefined">
          <span class="points">
            {{ whisky.points }}
            <span class="points-unit">points</span>
          </span>
          <!-- Scale from 70 to 100, where nearly every rating in the dataset falls. -->
          <span
            class="score-scale"
            :style="{ '--score': `${Math.min(Math.max((whisky.points - 70) / 30, 0), 1) * 100}%` }"
            aria-hidden="true"
          />
        </template>
        <span v-else-if="whisky.score" class="score-text">{{ whisky.score }}</span>
        <span v-else class="score-empty">—</span>
      </p>
      <h3 class="name">{{ whisky.name }}</h3>
      <p v-if="whisky.subtitle" class="subtitle">{{ whisky.subtitle }}</p>
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
  border: 1px solid var(--wh-line);
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.whisky-card:hover {
  border-color: rgba(161, 98, 7, 0.45);
}

.whisky-card:focus-visible {
  outline: 2px solid var(--wh-amber);
  outline-offset: 2px;
}

.image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 140px;
  flex-shrink: 0;
  padding: 0.75rem;
  background: radial-gradient(ellipse at 50% 35%, #fff 0%, #f5f5f4 60%, #ece9e4 100%);
}

.image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-fallback {
  color: var(--wh-faint);
  font-size: var(--fs-meta);
}

.body {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
  padding: 0.85rem 0.9rem 1rem;
}

/* ——— Score: the first thing read on every card ——— */
.score-line {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin: 0 0 0.35rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid var(--wh-line);
}

.points {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3rem;
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: var(--fw-display);
  line-height: 1;
  color: var(--wh-ink-soft);
  font-variant-numeric: tabular-nums;
}

.points-unit {
  font-family: var(--font-body);
  font-size: 0.72rem;
  font-weight: var(--fw-ui);
  color: var(--wh-faint);
}

.score-scale {
  position: relative;
  display: block;
  height: 3px;
  border-radius: 2px;
  background: rgba(28, 25, 23, 0.07);
  overflow: hidden;
}

.score-scale::after {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--score, 0%);
  content: '';
  border-radius: inherit;
  background: var(--wh-faint);
}

.is-top .points {
  color: var(--wh-amber);
}

.is-top .score-scale::after {
  background: linear-gradient(90deg, var(--wh-gold), var(--wh-amber));
}

.score-text {
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-score);
  color: var(--wh-amber);
}

.score-empty {
  font-family: var(--font-display);
  font-size: 2rem;
  line-height: 1;
  color: var(--wh-faint);
}

.name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.98rem;
  font-weight: var(--fw-display);
  line-height: 1.35;
  color: var(--wh-ink);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.whisky-card:hover .name {
  color: var(--wh-amber);
}

.subtitle {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--wh-muted);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

@media (max-width: 640px) {
  .image-wrap {
    height: 120px;
    padding: 0.6rem;
  }

  .body {
    padding: 0.7rem 0.75rem 0.85rem;
  }

  .points,
  .score-empty {
    font-size: 1.75rem;
  }

  .name {
    font-size: 0.9375rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .whisky-card {
    transition: none;
  }
}
</style>
