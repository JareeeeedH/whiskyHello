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
        <span v-if="whisky.points !== undefined">{{ whisky.points }} points</span>
        <span v-else-if="whisky.score">{{ whisky.score }}</span>
        <span v-else>—</span>
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
  border: 1px solid #e2e8f0;
  background: #fff;
  overflow: hidden;
}

.whisky-card:hover {
  border-color: #94a3b8;
}

.image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
  padding: 0.75rem;
  background: #f8fafc;
}

.image-wrap img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-fallback {
  color: #94a3b8;
  font-size: 0.875rem;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem;
  flex: 1;
}

.name {
  margin: 0;
  font-size: 1rem;
  line-height: 1.35;
  color: #0f172a;
}

.subtitle {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.4;
  color: #64748b;
}

.score-line {
  margin: auto 0 0;
  padding-top: 0.35rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #0f766e;
}
</style>
