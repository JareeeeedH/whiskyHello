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

/** Must match the `.photo-frame` aspect-ratio. */
const PHOTO_FRAME_ASPECT = 3 / 5

/** Photos are hosted by third parties and may refuse to load; those fall back to the placeholder. */
const failedImages = reactive(new Set<string>())
/** Photos wider than the frame: they fill its height and lose only empty side margins. */
const wideImages = reactive(new Set<string>())

function formatIndex(index: number): string {
  return `NO.${String(index + 1).padStart(2, '0')}`
}

function photoUrl(item: WhiskyRecommendation): string | null {
  return item.imageUrl && !failedImages.has(item.imageUrl) ? item.imageUrl : null
}

function onPhotoLoad(event: Event, url: string) {
  const image = event.target as HTMLImageElement
  if (image.naturalHeight && image.naturalWidth / image.naturalHeight > PHOTO_FRAME_ASPECT) {
    wideImages.add(url)
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
          <div
            v-if="photoUrl(item)"
            class="photo-frame"
            :class="{ 'is-wide': wideImages.has(item.imageUrl!) }"
          >
            <img
              :src="photoUrl(item)!"
              :alt="`${item.whiskyName} 酒瓶照片`"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
              @load="onPhotoLoad($event, item.imageUrl!)"
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

          <div v-if="item.matches.length" class="card-section is-matches">
            <h4>符合你的偏好</h4>
            <ul class="card-matches">
              <li v-for="(match, i) in item.matches" :key="match" :style="{ '--i': i }">{{ match }}</li>
            </ul>
          </div>

          <div v-if="item.considerations.length" class="card-section is-notes">
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
/*
 * The reveal: the title, then the best match (from 0.3s) unfolds piece by piece,
 * then the alternative (from 1.8s) repeats it at a quicker pace; about 3s in all.
 * Each card sets --start and --pace; every step is delayed by start + pace × offset.
 */
.recommendations {
  --ease-reveal: cubic-bezier(0.2, 0.7, 0.2, 1);
}

@keyframes reveal-rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

@keyframes reveal-draw {
  from {
    transform: scaleX(0);
  }
}

@keyframes reveal-fade {
  from {
    opacity: 0;
  }
}

.recommendations-title {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin: 0 0 1rem;
  color: var(--wh-ink);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
  animation: reveal-rise 450ms var(--ease-reveal) both;
}

.recommendations-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(201, 164, 106, 0.7), transparent);
  transform-origin: left;
  animation: reveal-draw 900ms var(--ease-reveal) 150ms both;
}

.cards {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  --start: 0s;
  --pace: 1;
  position: relative;
  display: grid;
  grid-template-columns: 9.5rem minmax(0, 1fr);
  gap: 1.6rem;
  align-items: start;
  padding: 1.6rem 1.75rem 1.5rem;
  border-radius: 18px;
  animation: reveal-rise 600ms var(--ease-reveal) var(--start) both;
}

.card.is-best {
  --start: 0.3s;
}

.card.is-alt {
  --start: 1.8s;
  --pace: 0.55;
}

/* Positioned so they paint above the best match's glow layer. */
.card-body {
  position: relative;
  min-width: 0;
}

.card-photo {
  position: relative;
  margin: 0;
  animation: reveal-rise 500ms var(--ease-reveal) calc(var(--start) + var(--pace) * 0.3s) both;
}

.card-eyebrow {
  animation: reveal-rise 450ms var(--ease-reveal) calc(var(--start) + var(--pace) * 0.4s) both;
}

.card-name {
  animation: reveal-rise 450ms var(--ease-reveal) calc(var(--start) + var(--pace) * 0.5s) both;
}

.card-rule {
  transform-origin: left;
  animation: reveal-draw 500ms var(--ease-reveal) calc(var(--start) + var(--pace) * 0.7s) both;
}

.card-reason {
  animation: reveal-rise 450ms var(--ease-reveal) calc(var(--start) + var(--pace) * 0.9s) both;
}

.card-section.is-matches h4 {
  animation: reveal-fade 400ms ease calc(var(--start) + var(--pace) * 1.1s) both;
}

.card-matches li {
  animation: reveal-rise 400ms var(--ease-reveal)
    calc(var(--start) + var(--pace) * (1.15s + var(--i, 0) * 0.1s)) both;
}

.card-section.is-notes {
  animation: reveal-rise 450ms var(--ease-reveal) calc(var(--start) + var(--pace) * 1.5s) both;
}

/* A slim, bottle-shaped frame (aspect ratio mirrored in PHOTO_FRAME_ASPECT). */
.photo-frame {
  display: grid;
  place-items: center;
  aspect-ratio: 3 / 5;
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

/*
 * Product shots are mostly square with the bottle centred and empty sides. Filling the
 * frame's height trims only those side margins; the bottle keeps its top and bottom.
 */
.photo-frame.is-wide img {
  object-fit: cover;
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

.card.is-best {
  border: 1px solid rgba(220, 184, 120, 0.28);
  background: var(--wh-night);
  box-shadow: 0 16px 36px rgba(17, 13, 17, 0.22);
  color: var(--wh-cream);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* The warm glow comes up slowly, like a light turned on over the bottle. */
.card.is-best::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(120% 90% at 100% 0%, rgba(220, 184, 120, 0.16), transparent 60%);
  pointer-events: none;
  animation: reveal-fade 1400ms ease calc(var(--start) + 0.3s) both;
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
  /* The bottle sits beside the name; the reason flows on underneath it, like a magazine layout. */
  .card {
    display: flow-root;
    padding: 1.2rem 1.1rem 1.15rem;
  }

  .card-photo {
    float: left;
    width: 5.75rem;
    margin: 0 1rem 0.6rem 0;
  }

  /* A new block formatting context, so the rule sits beside the photo instead of under it. */
  .card-rule {
    display: flow-root;
  }

  .is-best .card-name {
    font-size: 1.4rem;
  }

  .is-alt .card-name {
    font-size: 1.2rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .recommendations-title,
  .recommendations-title::after,
  .card,
  .card.is-best::before,
  .card-photo,
  .card-eyebrow,
  .card-name,
  .card-rule,
  .card-reason,
  .card-section.is-matches h4,
  .card-matches li,
  .card-section.is-notes {
    animation: none;
  }
}
</style>
