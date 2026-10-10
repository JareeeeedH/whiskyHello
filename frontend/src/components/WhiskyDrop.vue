<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  DROP_REST_RATIO,
  FALL_MS,
  dropOpacity,
  fallPosition,
  nextDropPhase,
  type DropPhase,
} from '../utils/whiskyDrop'

/** Splash droplet offsets from the impact point, in em (scales with the glass). */
const SPLASH_DOTS = [
  [-1.3, -1.1],
  [-0.8, -1.7],
  [-0.25, -2.1],
  [0.3, -2],
  [0.85, -1.6],
  [1.35, -1.05],
] as const

const animated = !window.matchMedia('(prefers-reduced-motion: reduce)').matches

const glassRef = ref<HTMLElement | null>(null)
const surfaceRef = ref<HTMLElement | null>(null)
const dropRef = ref<HTMLElement | null>(null)
const phase = ref<DropPhase>('following')

let frame = 0
let fallStartedAt = 0

function schedule() {
  frame ||= requestAnimationFrame(update)
}

function update(now: number) {
  frame = 0
  const glass = glassRef.value
  const surface = surfaceRef.value
  const drop = dropRef.value
  if (!glass || !surface || !drop) {
    return
  }

  const viewportHeight = window.innerHeight
  const glassRect = glass.getBoundingClientRect()
  const surfaceY = surface.getBoundingClientRect().top
  const restY = viewportHeight * DROP_REST_RATIO

  const atPageBottom =
    window.scrollY + viewportHeight >= document.documentElement.scrollHeight - 2
  const next = nextDropPhase(phase.value, surfaceY, viewportHeight, atPageBottom)
  if (next !== phase.value) {
    phase.value = next === 'falling' && surfaceY <= restY ? 'landed' : next
    fallStartedAt = now
  }

  let y = restY
  if (phase.value === 'falling') {
    const elapsed = (now - fallStartedAt) / FALL_MS
    if (elapsed >= 1) {
      phase.value = 'landed'
    } else {
      y = fallPosition(restY, surfaceY, elapsed)
      schedule()
    }
  }

  const travelled = window.scrollY / Math.max(1, window.scrollY + surfaceY - restY)
  drop.style.setProperty('--trail', `${(1.4 + 4.6 * Math.min(1, travelled)).toFixed(2)}em`)
  drop.style.transform = `translate3d(${glassRect.left + glassRect.width / 2}px, ${y}px, 0)`
  drop.style.opacity = phase.value === 'landed' ? '0' : String(dropOpacity(window.scrollY, viewportHeight))
}

onMounted(() => {
  if (!animated) {
    return
  }
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  schedule()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  cancelAnimationFrame(frame)
})
</script>

<template>
  <div class="whisky-drop" aria-hidden="true">
    <div v-if="animated" ref="dropRef" class="drop" :class="{ 'is-landed': phase === 'landed' }">
      <span class="drop-trail" />
      <svg class="drop-body" viewBox="0 0 20 28">
        <defs>
          <linearGradient id="whisky-drop-fill" x1="0.2" y1="0" x2="0.6" y2="1">
            <stop offset="0" stop-color="#f3dfb0" />
            <stop offset="0.45" stop-color="#d9a957" />
            <stop offset="1" stop-color="#8a5418" />
          </linearGradient>
        </defs>
        <path
          d="M10 0C10 0 19.5 12.5 19.5 18.5A9.5 9.5 0 0 1 0.5 18.5C0.5 12.5 10 0 10 0Z"
          fill="url(#whisky-drop-fill)"
        />
        <ellipse cx="6.4" cy="17.5" rx="1.5" ry="3" fill="#fff6e0" opacity="0.6" transform="rotate(18 6.4 17.5)" />
      </svg>
    </div>

    <div
      ref="glassRef"
      class="glass"
      :class="{ 'is-filled': !animated || phase === 'landed', 'is-animated': animated }"
    >
      <svg viewBox="0 0 48 56">
        <defs>
          <clipPath id="whisky-glass-inside">
            <path d="M4.6 5H43.4L40.4 44Q24 46.5 7.6 44Z" />
          </clipPath>
          <linearGradient id="whisky-glass-liquid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#e9c27a" />
            <stop offset="0.5" stop-color="#c4893a" />
            <stop offset="1" stop-color="#7d4a14" />
          </linearGradient>
        </defs>

        <g clip-path="url(#whisky-glass-inside)">
          <g class="glass-liquid">
            <rect x="0" y="42.5" width="48" height="34" fill="url(#whisky-glass-liquid)" />
            <ellipse cx="24" cy="42.5" rx="20" ry="1.8" fill="#f0d39a" opacity="0.7" />
          </g>
        </g>

        <path class="glass-heavy-base" d="M7.6 44Q24 46.5 40.4 44L40.8 48.5Q40.4 52 37 52H11Q7.6 52 7.2 48.5Z" />
        <path class="glass-flutes" d="M13 30V50M18.5 30V51.5M24 30V52M29.5 30V51.5M35 30V50" />
        <path class="glass-sheen" d="M8.4 10L10.4 40" />
        <path class="glass-outline" d="M4 5L7.2 48.5Q7.6 52 11 52H37Q40.4 52 40.8 48.5L44 5" />
        <ellipse class="glass-rim" cx="24" cy="5" rx="20" ry="2.4" />
        <path class="glass-base-line" d="M7.6 44Q24 46.5 40.4 44" />
      </svg>
      <span ref="surfaceRef" class="glass-surface" />
      <span class="glass-ripple" />
      <span
        v-for="([dx, dy], index) in SPLASH_DOTS"
        :key="index"
        class="splash-dot"
        :style="{ '--dx': `${dx}em`, '--dy': `${dy}em`, '--i': index }"
      />
    </div>
  </div>
</template>

<style scoped>
.whisky-drop {
  --drop-col: 1rem;
  font-size: 0.35rem;
  pointer-events: none;
}

/* ——— Falling drop (fixed to the viewport, x follows the glass) ——— */
.drop {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 5;
  opacity: 0;
  transition: opacity 400ms ease;
  will-change: transform, opacity;
}

.drop.is-landed {
  transition: none;
}

.drop-trail {
  position: absolute;
  bottom: 1.5em;
  left: -0.5px;
  width: 1px;
  height: var(--trail, 1.4em);
  background: linear-gradient(to bottom, transparent, rgba(220, 184, 120, 0.65));
}

.drop-body {
  position: absolute;
  bottom: 0;
  left: -0.75em;
  width: 1.5em;
  height: 2.1em;
  overflow: visible;
  transform-origin: 50% 100%;
  animation: drop-wobble 2.6s ease-in-out infinite;
}

@keyframes drop-wobble {
  50% {
    transform: scale(0.93, 1.06);
  }
}

/* ——— Glass in the closing section ——— */
/* Sits in the section's bottom padding, just below the closing button. */
.glass {
  position: absolute;
  bottom: 1rem;
  right: calc(var(--drop-col) - 2.4em);
  width: 4.8em;
  height: 5.6em;
}

.glass svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.glass-outline,
.glass-rim,
.glass-base-line,
.glass-flutes,
.glass-sheen {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.glass-outline,
.glass-rim {
  stroke: var(--wh-gold);
  stroke-width: 1.1;
}

.glass-outline {
  opacity: 0.8;
}

.glass-rim {
  opacity: 0.55;
}

.glass-base-line {
  stroke: var(--wh-gold);
  stroke-width: 1;
  opacity: 0.45;
}

.glass-heavy-base {
  fill: rgba(220, 184, 120, 0.1);
}

.glass-flutes {
  stroke: var(--wh-gold);
  stroke-width: 1;
  opacity: 0.16;
}

.glass-sheen {
  stroke: var(--wh-cream);
  stroke-width: 1.4;
  opacity: 0.28;
}

/* Starts as the last film at the bottom, then pours up to about a quarter full — a typical dram. */
.glass-liquid {
  opacity: 0.88;
  transition: transform 1200ms cubic-bezier(0.3, 0.75, 0.25, 1) 150ms;
}

.glass.is-filled .glass-liquid {
  transform: translateY(-8.5px);
}

.glass-surface,
.glass-ripple,
.splash-dot {
  position: absolute;
  top: 75.9%;
  left: 50%;
}

.glass-ripple {
  width: 2.4em;
  height: 0.5em;
  margin: -0.25em 0 0 -1.2em;
  border: 1px solid var(--wh-gold-bright);
  border-radius: 50%;
  opacity: 0;
}

.splash-dot {
  width: 0.32em;
  height: 0.32em;
  margin: -0.16em 0 0 -0.16em;
  border-radius: 50%;
  background: var(--wh-gold-bright);
  opacity: 0;
}

.glass.is-animated.is-filled .glass-ripple {
  animation: glass-ripple 900ms ease-out;
}

.glass.is-animated.is-filled .splash-dot {
  animation: splash-dot 760ms cubic-bezier(0.2, 0.7, 0.2, 1) calc(var(--i) * 15ms);
}

@keyframes glass-ripple {
  from {
    opacity: 0.9;
    transform: scale(0.2);
  }
  to {
    opacity: 0;
    transform: scale(1.2);
  }
}

@keyframes splash-dot {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  55% {
    opacity: 1;
    transform: translate(var(--dx), var(--dy)) scale(0.9);
  }
  100% {
    opacity: 0;
    transform: translate(calc(var(--dx) * 1.25), calc(var(--dy) + 0.9em)) scale(0.5);
  }
}

@media (max-width: 640px) {
  .glass {
    bottom: 0.5rem;
  }
}

@media (min-width: 1280px) {
  .whisky-drop {
    --drop-col: calc((100% - 1120px) / 4);
    font-size: 0.625rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .glass-liquid {
    transition: none;
  }
}
</style>
