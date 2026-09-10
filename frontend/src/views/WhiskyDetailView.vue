<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { getWhiskyById } from '../services/whiskyService'

const route = useRoute()

const whisky = computed(() => {
  const id = String(route.params.id ?? '')
  if (!id) {
    return undefined
  }
  return getWhiskyById(id)
})
</script>

<template>
  <main class="detail">
    <p class="back">
      <RouterLink to="/whiskies">← 返回搜尋</RouterLink>
    </p>

    <template v-if="whisky">
      <section class="hero">
        <div class="image-wrap">
          <img
            v-if="whisky.imageUrl"
            :src="whisky.imageUrl"
            :alt="whisky.name"
            class="image"
          />
          <div v-else class="image-fallback">No image</div>
        </div>

        <div class="summary">
          <h1>{{ whisky.name }}</h1>
          <p v-if="whisky.subtitle" class="subtitle">{{ whisky.subtitle }}</p>

          <div class="ratings">
            <div v-if="whisky.points !== undefined" class="points-block">
              <span class="points-value">{{ whisky.points }}</span>
              <span class="points-unit">points</span>
            </div>
            <div class="meta-list">
              <p v-if="whisky.sgp"><span class="meta-label">SGP</span> {{ whisky.sgp }}</p>
              <p v-if="whisky.score"><span class="meta-label">Score</span> {{ whisky.score }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="block">
        <h2>知名評論家評論</h2>
        <div v-if="whisky.note" class="note">{{ whisky.note }}</div>
        <p v-else class="empty">目前沒有知名評論家評論。</p>
      </section>

      <section class="block">
        <h2>使用者評論</h2>
        <p class="empty">尚無使用者評論。之後可在此查看與撰寫評論。</p>
      </section>
    </template>

    <section v-else class="not-found">
      <h1>Whisky not found</h1>
      <p>找不到這款威士忌，請返回搜尋再試一次。</p>
      <RouterLink to="/whiskies">← 返回搜尋</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.detail {
  max-width: 880px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem 2.5rem;
}

.back {
  margin: 0 0 1.25rem;
}

.back a,
.not-found a {
  color: #0f766e;
  text-decoration: none;
}

.hero {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1.5rem;
  align-items: start;
  margin-bottom: 1.75rem;
}

.image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 260px;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-fallback {
  color: #94a3b8;
  font-size: 0.875rem;
}

.summary h1 {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  line-height: 1.25;
  color: #0f172a;
}

.subtitle {
  margin: 0 0 1rem;
  color: #64748b;
  line-height: 1.5;
}

.ratings {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  align-items: flex-end;
}

.points-block {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.points-value {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
  color: #0f766e;
}

.points-unit {
  font-size: 0.875rem;
  font-weight: 600;
  color: #0f766e;
}

.meta-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.meta-list p {
  margin: 0;
  color: #334155;
  line-height: 1.4;
}

.meta-label {
  display: inline-block;
  min-width: 3.25rem;
  margin-right: 0.35rem;
  font-weight: 600;
  color: #475569;
}

.block {
  margin-bottom: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e2e8f0;
}

.block h2 {
  margin: 0 0 0.75rem;
  font-size: 1.125rem;
  color: #0f172a;
}

.note {
  margin: 0;
  color: #334155;
  font-size: 1rem;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.empty {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.not-found h1 {
  margin: 0 0 0.75rem;
}

.not-found p {
  margin: 0 0 1rem;
  color: #64748b;
}

@media (max-width: 720px) {
  .detail {
    padding: 1rem 1rem 2rem;
  }

  .hero {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .image-wrap {
    height: 220px;
  }

  .summary h1 {
    font-size: 1.5rem;
  }

  .points-value {
    font-size: 2.125rem;
  }
}
</style>
