<script setup lang="ts">
import { reactive, useId } from 'vue'
import { getWhiskyById } from '../services/whiskyService'
import type { WhiskyRecommendation } from '../types/sommelier'

defineProps<{
  recommendations: WhiskyRecommendation[]
}>()

/** Every round of the conversation has its own cards, so each heading needs its own id. */
const titleId = useId()

const COUNT_WORDS = ['', '一', '兩', '三']

/** Cards unfold one after another, each at the same pace. */
function cardTiming(index: number): Record<string, string> {
  return { '--start': `${0.3 + index * 0.6}s` }
}

/** Must match the `.photo-frame` aspect-ratio. */
const PHOTO_FRAME_ASPECT = 3 / 5

/** Photos are hosted by third parties and may refuse to load; those fall back to the placeholder. */
const failedImages = reactive(new Set<string>())
/** Photos wider than the frame: they fill its height and lose only empty side margins. */
const wideImages = reactive(new Set<string>())

/** Words that end the distillery part of a name: ages, "Year Old" suffixes and style words. */
const NAME_STOP_WORDS = [
  'year', 'years', 'yo', 'old', 'ten', 'twelve', 'fifteen', 'eighteen',
  'from', 'single', 'malt', 'blended', 'scotch', 'whisky', 'whiskey',
]

/**
 * The distillery or brand at the start of a whisky name, for the no-photo card:
 * "Highland Park 18 Year Old Viking Pride" → "Highland Park", "Big Peat (55.7%, …)" → "Big Peat".
 */
function distilleryName(name: string): string {
  const words = name.split('(')[0].trim().split(/\s+/)
  const kept: string[] = []
  for (const word of words) {
    if (/\d/.test(word) || NAME_STOP_WORDS.includes(word.toLowerCase())) {
      break
    }
    kept.push(word)
    if (kept.length === 3) {
      break
    }
  }
  return kept.length ? kept.join(' ') : name
}

/**
 * Critic-note names carry the bottling details in brackets:
 * "Big Peat (55.7%, Douglas Laing, 2014)" → title "Big Peat", details "55.7%, Douglas Laing, 2014".
 */
function splitName(name: string): { title: string; details: string } {
  const open = name.indexOf('(')
  if (open <= 0) {
    return { title: name, details: '' }
  }
  return { title: name.slice(0, open).trim(), details: name.slice(open + 1).replace(/\)\s*$/, '').trim() }
}

function formatIndex(index: number): string {
  return `NO.${String(index + 1).padStart(2, '0')}`
}

/** The site's own bottle photo for this whisky, when it has one. */
function sourcePhotoUrl(item: WhiskyRecommendation): string | null {
  return getWhiskyById(item.whiskyId)?.imageUrl ?? null
}

function photoUrl(item: WhiskyRecommendation): string | null {
  const url = sourcePhotoUrl(item)
  return url && !failedImages.has(url) ? url : null
}

function onPhotoLoad(event: Event, url: string) {
  const image = event.target as HTMLImageElement
  if (image.naturalHeight && image.naturalWidth / image.naturalHeight > PHOTO_FRAME_ASPECT) {
    wideImages.add(url)
  }
}
</script>


<template>
  <section class="recommendations" :aria-labelledby="titleId">
    <h2 :id="titleId" class="recommendations-title">
      侍酒師為你挑的{{ COUNT_WORDS[recommendations.length] ?? recommendations.length }}支
    </h2>

    <ol class="cards">
      <li
        v-for="(item, index) in recommendations"
        :key="item.whiskyId"
        class="card"
        :style="cardTiming(index)"
      >
        <p class="card-eyebrow">{{ formatIndex(index) }}</p>

        <div class="card-head">
          <figure class="card-photo">
            <div
              v-if="photoUrl(item)"
              class="photo-frame"
              :class="{ 'is-wide': wideImages.has(photoUrl(item)!) }"
            >
              <img
                :src="photoUrl(item)!"
                :alt="`${item.whiskyName} 酒瓶照片`"
                loading="lazy"
                decoding="async"
                referrerpolicy="no-referrer"
                @load="onPhotoLoad($event, photoUrl(item)!)"
                @error="failedImages.add(photoUrl(item)!)"
              />
            </div>
            <div v-else class="photo-frame is-empty">
              <span class="empty-name" lang="en">{{ distilleryName(item.whiskyName) }}</span>
            </div>
          </figure>

          <div class="card-titles">
            <h3 class="card-name" lang="en">
              <RouterLink :to="`/whiskies/${item.whiskyId}`" class="card-link">
                {{ splitName(item.whiskyName).title }}
              </RouterLink>
            </h3>
            <p v-if="splitName(item.whiskyName).details" class="card-details" lang="en">
              {{ splitName(item.whiskyName).details }}
            </p>
          </div>
        </div>

        <span class="card-rule" aria-hidden="true" />
        <p class="card-reason">{{ item.reason }}</p>

        <div v-if="item.matches.length" class="card-section is-matches">
          <h4>符合你的描述</h4>
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

      </li>
    </ol>
  </section>
</template>

<style scoped>
/*
 * The reveal: the title, then each card unfolds piece by piece, 0.6s after the one before.
 * cardTiming() sets each card's --start; every step is delayed by start + pace × offset.
 */
.recommendations {
  --ease-reveal: cubic-bezier(0.2, 0.7, 0.2, 1);
  --accent: #8f5a22;
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

/* A column of blocks; side-by-side cards stretch to the same height. */
.card {
  --start: 0s;
  --pace: 0.7;
  display: flex;
  flex-direction: column;
  padding: 1.4rem 1.5rem 1.25rem;
  border: 1px solid #e8dcc6;
  border-radius: 18px;
  background: #f7f0e4;
  color: var(--wh-ink);
  animation: reveal-rise 600ms var(--ease-reveal) var(--start) both;
}

.card-eyebrow {
  margin: 0 0 0.8rem;
  color: var(--accent);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  animation: reveal-rise 450ms var(--ease-reveal) calc(var(--start) + var(--pace) * 0.3s) both;
}

/* The bottle sits beside its name, so the photo fills a row instead of leaving empty space. */
.card-head {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: 1rem;
  align-items: center;
}

.card-photo {
  margin: 0;
  animation: reveal-rise 500ms var(--ease-reveal) calc(var(--start) + var(--pace) * 0.4s) both;
}

.card-titles {
  min-width: 0;
  animation: reveal-rise 450ms var(--ease-reveal) calc(var(--start) + var(--pace) * 0.5s) both;
}

/* A slim, bottle-shaped frame (aspect ratio mirrored in PHOTO_FRAME_ASPECT). */
.photo-frame {
  display: grid;
  place-items: center;
  aspect-ratio: 3 / 5;
  border-radius: 10px;
  background: #efe5d3;
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

.photo-frame.is-empty {
  color: #b39566;
  text-align: center;
}

.empty-name {
  padding: 0 0.3rem;
  font-family: var(--font-display);
  font-size: 0.72rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.card-name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.card-link {
  color: inherit;
  text-decoration: none;
}

.card-link:hover {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}

.card-details {
  margin: 0.35rem 0 0;
  color: var(--wh-muted);
  font-size: 0.78rem;
  line-height: 1.5;
  letter-spacing: 0.02em;
  overflow-wrap: anywhere;
}

.card-rule {
  display: block;
  width: 2.5rem;
  height: 1px;
  margin: 1.1rem 0 0.9rem;
  background: var(--wh-gold);
  transform-origin: left;
  animation: reveal-draw 500ms var(--ease-reveal) calc(var(--start) + var(--pace) * 0.7s) both;
}

.card-reason {
  margin: 0;
  color: var(--wh-ink-soft);
  font-size: 0.95rem;
  line-height: 1.8;
  animation: reveal-rise 450ms var(--ease-reveal) calc(var(--start) + var(--pace) * 0.9s) both;
}

.card-section {
  margin-top: 1.1rem;
}

.card-section h4 {
  margin: 0 0 0.45rem;
  color: var(--wh-muted);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.card-section.is-matches h4 {
  animation: reveal-fade 400ms ease calc(var(--start) + var(--pace) * 1.1s) both;
}

/* Tags wrap cleanly and read at a glance. */
.card-matches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card-matches li {
  padding: 0.22rem 0.65rem;
  border: 1px solid rgba(143, 90, 34, 0.22);
  border-radius: 999px;
  background: rgba(255, 250, 242, 0.7);
  color: var(--accent);
  font-size: 0.82rem;
  line-height: 1.45;
  animation: reveal-rise 400ms var(--ease-reveal)
    calc(var(--start) + var(--pace) * (1.15s + var(--i, 0) * 0.1s)) both;
}

.card-section.is-notes {
  animation: reveal-rise 450ms var(--ease-reveal) calc(var(--start) + var(--pace) * 1.5s) both;
}

.card-notes {
  display: grid;
  gap: 0.15rem;
  margin: 0;
  padding: 0;
  color: var(--wh-muted);
  list-style: none;
  font-size: 0.86rem;
  line-height: 1.6;
}

.card-notes li {
  display: flex;
  gap: 0.45rem;
}

.card-notes li::before {
  content: '△';
  flex: none;
  color: #c2a676;
  font-size: 0.7rem;
  line-height: 1.6rem;
}

.card-link:focus-visible {
  outline: 2px solid var(--wh-amber);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Wide screens: the cards stand side by side, one column each, the same height. */
@media (min-width: 900px) {
  .cards {
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
    align-items: stretch;
  }
}

@media (max-width: 640px) {
  .card {
    padding: 1.2rem 1.1rem 1.1rem;
  }

  .card-head {
    grid-template-columns: 4rem minmax(0, 1fr);
    gap: 0.85rem;
  }

  .card-name {
    font-size: 1.15rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .recommendations-title,
  .recommendations-title::after,
  .card,
  .card-eyebrow,
  .card-photo,
  .card-titles,
  .card-rule,
  .card-reason,
  .card-section.is-matches h4,
  .card-matches li,
  .card-section.is-notes {
    animation: none;
  }
}
</style>
