<script setup lang="ts">
import type { RecommendationType, WhiskyRecommendation } from '../types/sommelier'

defineProps<{
  recommendations: WhiskyRecommendation[]
}>()

const TYPE_LABELS: Record<RecommendationType, string> = {
  best_match: '最適合你',
  alternative: '值得探索',
}

function formatIndex(index: number): string {
  return `NO.${String(index + 1).padStart(2, '0')}`
}
</script>

<template>
  <section class="recommendations" aria-labelledby="recommendations-title">
    <h2 id="recommendations-title" class="recommendations-title">侍酒師為你挑的兩支</h2>

    <ol class="cards">
      <li
        v-for="(item, index) in recommendations"
        :key="item.type"
        class="card"
        :class="item.type === 'best_match' ? 'is-best' : 'is-alt'"
      >
        <p class="card-eyebrow">
          <span>{{ formatIndex(index) }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ TYPE_LABELS[item.type] }}</span>
        </p>
        <h3 class="card-name" lang="en">{{ item.whiskyName }}</h3>
        <span class="card-rule" aria-hidden="true" />
        <p class="card-reason">{{ item.reason }}</p>

        <div v-if="item.matches.length" class="card-section">
          <h4>符合你的偏好</h4>
          <ul class="card-matches">
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
  margin: 0 0 1rem;
  color: var(--wh-ink);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
}

.cards {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  padding: 1.6rem 1.75rem 1.5rem;
  border-radius: 18px;
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
  border: 1px solid rgba(220, 184, 120, 0.28);
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(220, 184, 120, 0.14), transparent 60%),
    var(--wh-night);
  box-shadow: 0 16px 36px rgba(17, 13, 17, 0.22);
  color: var(--wh-cream);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.card.is-alt {
  border: 1px solid #e8dcc6;
  background: #f7f0e4;
  color: var(--wh-ink);
}

.card-eyebrow {
  display: flex;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.18em;
}

.is-best .card-eyebrow {
  color: var(--wh-gold-bright);
}

.is-alt .card-eyebrow {
  color: #8f5a22;
}

.card-name {
  margin: 0.7rem 0 0;
  font-family: var(--font-display);
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.is-best .card-name {
  font-size: 1.6rem;
}

.is-alt .card-name {
  font-size: 1.3rem;
}

.card-rule {
  display: block;
  width: 2.5rem;
  height: 1px;
  margin: 0.95rem 0;
  background: var(--wh-gold);
}

.card-reason {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.8;
}

.is-best .card-reason {
  color: rgba(241, 233, 220, 0.88);
}

.is-alt .card-reason {
  color: var(--wh-ink-soft);
}

.card-section {
  margin-top: 1.1rem;
}

.card-section h4 {
  margin: 0 0 0.35rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.is-best .card-section h4 {
  color: var(--wh-mauve);
}

.is-alt .card-section h4 {
  color: var(--wh-muted);
}

.card-matches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 0;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.92rem;
  line-height: 1.6;
}

.card-matches li + li::before {
  content: '·';
  margin: 0 0.6rem;
}

.is-best .card-matches {
  color: var(--wh-gold-bright);
}

.is-alt .card-matches {
  color: #8f5a22;
}

.card-notes {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.86rem;
  line-height: 1.7;
}

.is-best .card-notes {
  color: var(--wh-mauve);
}

.is-alt .card-notes {
  color: var(--wh-muted);
}

@media (max-width: 640px) {
  .card {
    padding: 1.3rem 1.2rem 1.2rem;
  }

  .is-best .card-name {
    font-size: 1.4rem;
  }

  .is-alt .card-name {
    font-size: 1.2rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
  }
}
</style>
