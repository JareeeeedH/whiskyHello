<script setup lang="ts">
import { reactive } from 'vue'
import type { RecommendationType, WhiskyRecommendation } from '../types/sommelier'

defineProps<{
  recommendations: WhiskyRecommendation[]
}>()

const TYPE_LABELS: Record<RecommendationType, string> = {
  best_match: '最適合你',
  alternative: '值得探索',
}

/** Photos are hosted by third parties and may refuse to load; those fall back to the placeholder. */
const failedImages = reactive(new Set<string>())

function formatIndex(index: number): string {
  return `NO.${String(index + 1).padStart(2, '0')}`
}

function photoUrl(item: WhiskyRecommendation): string | null {
  return item.imageUrl && !failedImages.has(item.imageUrl) ? item.imageUrl : null
}

function sourceHost(url: string | null): string | null {
  if (!url) {
    return null
  }
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
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
        <figure class="card-photo">
          <div v-if="photoUrl(item)" class="photo-frame">
            <img
              :src="photoUrl(item)!"
              :alt="`${item.whiskyName} 酒瓶照片`"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
              @error="failedImages.add(item.imageUrl!)"
            />
          </div>
          <div v-else class="photo-frame is-empty">
            <svg viewBox="0 0 40 96" aria-hidden="true">
              <path
                d="M16 4h8v18c0 4 8 8 8 18v48a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V40c0-10 8-14 8-18z"
              />
              <path d="M8 52h24M8 74h24" />
            </svg>
            <span>暫無酒瓶照片</span>
          </div>
          <figcaption v-if="photoUrl(item) && sourceHost(item.imageSourceUrl)">
            <a :href="item.imageSourceUrl!" target="_blank" rel="noopener noreferrer nofollow">
              圖片來源 · {{ sourceHost(item.imageSourceUrl) }}
            </a>
          </figcaption>
        </figure>

        <div class="card-body">
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
  display: grid;
  grid-template-columns: 11rem minmax(0, 1fr);
  gap: 1.6rem;
  align-items: start;
  padding: 1.6rem 1.75rem 1.5rem;
  border-radius: 18px;
  animation: card-reveal 480ms ease both;
}

.card-body {
  min-width: 0;
}

.card-photo {
  margin: 0;
}

/* Most product shots are square with the bottle centred, so a near-square frame keeps it large. */
.photo-frame {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 5;
  padding: 0.4rem;
  border-radius: 12px;
  overflow: hidden;
}

/* Product shots usually sit on white; multiply blends that white into the plate. */
.photo-frame img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  mix-blend-mode: multiply;
}

.is-best .photo-frame {
  background: #f3ebdd;
}

.is-alt .photo-frame {
  border: 1px solid #ebdfc9;
  background: #fffaf2;
}

.photo-frame.is-empty {
  align-content: center;
  gap: 0.6rem;
  text-align: center;
}

.is-best .photo-frame.is-empty {
  border: 1px solid rgba(220, 184, 120, 0.22);
  background: rgba(241, 233, 220, 0.05);
  color: var(--wh-gold-bright);
}

.is-alt .photo-frame.is-empty {
  color: #b39566;
}

.photo-frame.is-empty svg {
  width: 2.2rem;
  height: auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linejoin: round;
  opacity: 0.75;
}

.photo-frame.is-empty span {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  opacity: 0.85;
}

.card-photo figcaption {
  margin-top: 0.45rem;
  font-size: 0.7rem;
  line-height: 1.4;
  text-align: center;
  overflow-wrap: anywhere;
}

.card-photo figcaption a {
  color: inherit;
  text-decoration: none;
}

.card-photo figcaption a:hover,
.card-photo figcaption a:focus-visible {
  text-decoration: underline;
}

.is-best .card-photo figcaption {
  color: var(--wh-mauve);
}

.is-alt .card-photo figcaption {
  color: var(--wh-muted);
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
    grid-template-columns: minmax(0, 1fr);
    gap: 1.1rem;
    padding: 1.3rem 1.2rem 1.2rem;
  }

  .photo-frame {
    aspect-ratio: auto;
    height: 12rem;
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
