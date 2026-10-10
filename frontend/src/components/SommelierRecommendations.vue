<script setup lang="ts">
import type { RecommendationType, WhiskyRecommendation } from '../types/sommelier'

defineProps<{
  recommendations: WhiskyRecommendation[]
}>()

const TYPE_LABELS: Record<RecommendationType, string> = {
  best_match: '最適合你',
  alternative: '值得探索',
}
</script>

<template>
  <section class="recommendations" aria-labelledby="recommendations-title">
    <h2 id="recommendations-title" class="recommendations-title">侍酒師為你挑的兩支</h2>

    <ol class="cards">
      <li
        v-for="item in recommendations"
        :key="item.type"
        class="card"
        :class="{ 'is-best': item.type === 'best_match' }"
      >
        <span class="card-label">{{ TYPE_LABELS[item.type] }}</span>
        <h3 class="card-name" lang="en">{{ item.whiskyName }}</h3>
        <p class="card-reason">{{ item.reason }}</p>

        <div v-if="item.matches.length" class="card-section">
          <h4>符合你的偏好</h4>
          <ul class="card-tags">
            <li v-for="match in item.matches" :key="match">{{ match }}</li>
          </ul>
        </div>

        <div v-if="item.considerations.length" class="card-section">
          <h4>可以留意</h4>
          <ul class="card-notes">
            <li v-for="note in item.considerations" :key="note">{{ note }}</li>
          </ul>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.recommendations-title {
  margin: 0 0 0.85rem;
  color: var(--wh-ink);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
}

.cards {
  display: grid;
  gap: 0.85rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  padding: 1.15rem 1.25rem;
  border: 1px solid #ebe3d6;
  border-radius: 16px;
  background: #fff;
  animation: card-reveal 480ms ease both;
}

.card:nth-child(2) {
  animation-delay: 600ms;
}

@keyframes card-reveal {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

.card.is-best {
  border-color: #e3c48f;
  box-shadow: 0 6px 18px rgba(146, 64, 14, 0.08);
}

.card-label {
  display: inline-block;
  padding: 0.12rem 0.6rem;
  border-radius: 999px;
  background: var(--wh-paper);
  color: var(--wh-muted);
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.card.is-best .card-label {
  background: #fdf3df;
  color: #8f5a22;
}

.card-name {
  margin: 0.55rem 0 0;
  color: var(--wh-ink);
  font-family: var(--font-display);
  font-size: 1.12rem;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.card-reason {
  margin: 0.45rem 0 0;
  color: var(--wh-ink);
  font-size: 0.92rem;
  line-height: 1.7;
}

.card-section {
  margin-top: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--wh-line);
}

.card-section h4 {
  margin: 0 0 0.45rem;
  color: var(--wh-muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card-tags li {
  padding: 0.15rem 0.65rem;
  border: 1px solid #e3c48f;
  border-radius: 999px;
  background: #fdf3df;
  color: #6f381c;
  font-size: 0.82rem;
}

.card-notes {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--wh-muted);
  font-size: 0.86rem;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .card {
    padding: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
  }
}
</style>
