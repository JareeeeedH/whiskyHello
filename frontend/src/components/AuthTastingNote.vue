<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { Whisky } from '../types/whisky'

/** Only well-rated bottles greet people on the sign-in pages. */
const MIN_POINTS = 90
/** Long enough to carry the aromas, short enough to read at a glance. */
const MAX_EXCERPT_LENGTH = 220

interface TastingNote {
  whisky: Whisky
  excerpt: string
}

const note = ref<TastingNote | null>(null)
const failed = ref(false)

/** Some notes carry HTML entities such as "cr&egrave;me"; read them as plain text, never as markup. */
function decodeEntities(text: string): string {
  return new DOMParser().parseFromString(text, 'text/html').documentElement.textContent ?? text
}

function toExcerpt(sections: { key: string; content: string }[] | null): string {
  const section =
    sections?.find((item) => item.key === 'nose') ??
    sections?.find((item) => item.key === 'palate')
  // Keep the neat impression; "With water" asides make the quote run on.
  const raw = decodeEntities(section?.content ?? '')
    .split(/\bwith water\b/i)[0]!
    .replace(/\s+/g, ' ')
    .trim()
  // The note continues after "Nose:", so it often starts in lower case.
  const text = raw.charAt(0).toUpperCase() + raw.slice(1)

  if (text.length <= MAX_EXCERPT_LENGTH) {
    return text
  }
  const cut = text.slice(0, MAX_EXCERPT_LENGTH)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.]+$/, '')}…`
}

onMounted(async () => {
  try {
    // Loaded after the form renders: the whisky index is large and the form must not wait for it.
    const [{ getWhiskies, getWhiskyNote }, { parseCriticReview }] = await Promise.all([
      import('../services/whiskyService'),
      import('../utils/criticReviewParser'),
    ])
    const candidates = getWhiskies().filter(
      (whisky) => whisky.points !== undefined && whisky.points >= MIN_POINTS,
    )
    const whisky = candidates[Math.floor(Math.random() * candidates.length)]
    if (!whisky) {
      failed.value = true
      return
    }

    const text = await getWhiskyNote(whisky.id)
    const excerpt = text ? toExcerpt(parseCriticReview(text)) : ''
    if (excerpt) {
      note.value = { whisky, excerpt }
    } else {
      failed.value = true
    }
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <aside class="tasting-note" aria-label="品飲筆記">
    <Transition name="note-in">
      <figure v-if="note" class="note">
        <blockquote class="note-quote" lang="en">“{{ note.excerpt }}”</blockquote>
        <figcaption class="note-source">
          <RouterLink :to="`/whiskies/${note.whisky.id}`" class="note-whisky">
            {{ note.whisky.name }}
          </RouterLink>
          <span class="note-meta">
            <span class="note-points">{{ note.whisky.points }} points</span>
            <span class="note-credit">引用自 WhiskyFun 的香氣描述</span>
          </span>
        </figcaption>
      </figure>
      <p v-else-if="failed" class="note-fallback">上萬篇品飲筆記，登入後慢慢翻。</p>
    </Transition>
  </aside>
</template>

<style scoped>
.tasting-note {
  display: flex;
  align-items: flex-end;
  min-width: 0;
  padding: clamp(2.5rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4.5rem);
  border-right: 1px solid var(--wh-night-line);
  background:
    radial-gradient(ellipse 80% 60% at 0% 100%, rgba(220, 184, 120, 0.08), transparent 70%),
    var(--wh-night);
}

.note {
  max-width: 34rem;
  margin: 0;
}

.note-quote {
  margin: 0 0 1.75rem;
  /* Hang the opening quote mark so the text block keeps a clean left edge. */
  text-indent: -0.45em;
  font-family: var(--font-display);
  font-size: clamp(1.375rem, 2.3vw, 1.875rem);
  font-weight: 500;
  line-height: 1.55;
  color: var(--wh-cream);
}

.note-source {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-top: 1rem;
  border-top: 1px solid var(--wh-night-line);
}

.note-whisky {
  color: var(--wh-gold-bright);
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-emphasis);
  line-height: 1.45;
  text-decoration: none;
}

.note-whisky:hover {
  text-decoration: underline;
}

.note-whisky:focus-visible {
  outline: 2px solid var(--wh-gold-bright);
  outline-offset: 2px;
  border-radius: 2px;
}

.note-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  color: var(--wh-mauve);
  font-size: var(--fs-meta);
}

.note-points {
  color: var(--wh-cream);
  font-variant-numeric: tabular-nums;
}

.note-fallback {
  margin: 0;
  max-width: 20em;
  font-family: var(--font-display);
  font-size: clamp(1.375rem, 2.3vw, 1.875rem);
  line-height: 1.5;
  color: var(--wh-mauve);
}

/* The one moment on the page: the note settles in once it has loaded. */
.note-in-enter-active {
  transition:
    opacity 0.9s ease,
    transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

.note-in-enter-from {
  opacity: 0;
  transform: translateY(0.5rem);
}

@media (max-width: 860px) {
  .tasting-note {
    min-height: 0;
    /* Sits below the form on small screens, so loading it never pushes the fields down. */
    padding: 1.5rem 1rem 2rem;
    border-right: 0;
    border-top: 1px solid var(--wh-night-line);
  }

  .note-quote {
    display: -webkit-box;
    margin-bottom: 0.75rem;
    overflow: hidden;
    font-size: 1rem;
    line-height: 1.6;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }

  .note-source {
    gap: 0.15rem;
    padding-top: 0;
    border-top: 0;
  }

  .note-whisky {
    font-size: var(--fs-meta);
  }

  .note-credit {
    display: none;
  }

  .note-fallback {
    font-size: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .note-in-enter-active {
    transition: none;
  }
}
</style>
