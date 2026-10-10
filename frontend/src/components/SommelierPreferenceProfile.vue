<script setup lang="ts">
import { computed } from 'vue'
import type { SommelierInput } from '../types/sommelier'
import {
  RATING_MAX,
  RATING_MIN,
  STYLE_KEYS,
  STYLE_LABELS,
  STYLE_SCALE_HINTS,
  TASTE_KEYS,
  TASTE_LABELS,
  describeStyleRating,
  describeTasteLevel,
} from '../utils/sommelierInput'
import { HIGH_RATING, formatBudget } from '../utils/sommelierConversation'
import { PREFERENCE_OCCASION_LABELS } from '../utils/sommelierPreference'

const props = defineProps<{
  preference: SommelierInput
}>()

/** Only the tastes the user picked and rated (the rest are unspecified, not low), strongest first. */
const ratedTastes = computed(() =>
  TASTE_KEYS.filter((key) => props.preference.taste[key] !== undefined).sort(
    (a, b) => (props.preference.taste[b] ?? 0) - (props.preference.taste[a] ?? 0),
  ),
)

/** Where a style rating sits between its two ends. */
function scalePosition(value: number): string {
  return `${((value - RATING_MIN) / (RATING_MAX - RATING_MIN)) * 100}%`
}
</script>

<template>
  <section class="profile" aria-labelledby="profile-title">
    <h2 id="profile-title" class="profile-title">你的偏好輪廓</h2>

    <dl class="profile-list">
      <div>
        <dt>想喝到的風味</dt>
        <dd class="meters">
          <div
            v-for="(key, row) in ratedTastes"
            :key="key"
            class="meter"
            :class="{ 'is-lead': (preference.taste[key] ?? 0) >= HIGH_RATING }"
            :style="{ '--row': row }"
          >
            <span class="meter-label">{{ TASTE_LABELS[key] }}</span>
            <span class="meter-bar" aria-hidden="true">
              <span
                v-for="n in RATING_MAX"
                :key="n"
                :class="{ 'is-on': n <= (preference.taste[key] ?? 0) }"
                :style="{ '--n': n }"
              />
            </span>
            <span class="meter-value">
              <strong>{{ preference.taste[key] }}</strong>
              {{ describeTasteLevel(preference.taste[key] ?? 0) }}
            </span>
          </div>
        </dd>
      </div>
      <div>
        <dt>喝感</dt>
        <dd class="meters">
          <div
            v-for="(key, i) in STYLE_KEYS"
            :key="key"
            class="meter"
            :style="{ '--row': ratedTastes.length + i }"
          >
            <span class="meter-label">{{ STYLE_LABELS[key] }}</span>
            <span class="meter-scale" aria-hidden="true">
              <span class="scale-track">
                <span class="scale-dot" :style="{ '--pos': scalePosition(preference.style[key]) }" />
              </span>
              <span class="scale-ends">
                <span>{{ STYLE_SCALE_HINTS[key].min }}</span>
                <span>{{ STYLE_SCALE_HINTS[key].max }}</span>
              </span>
            </span>
            <span class="meter-value">
              <strong>{{ preference.style[key] }}</strong>
              {{ describeStyleRating(key, preference.style[key]) }}
            </span>
          </div>
        </dd>
      </div>
      <div>
        <dt>預算</dt>
        <dd>
          <span v-if="preference.budget">{{ formatBudget(preference.budget) }}</span>
          <span v-else class="muted">未指定</span>
        </dd>
      </div>
      <div>
        <dt>飲酒情境</dt>
        <dd>
          <span v-if="preference.occasion">{{ PREFERENCE_OCCASION_LABELS[preference.occasion] }}</span>
          <span v-else class="muted">沒有特定情境</span>
        </dd>
      </div>
      <div v-if="preference.freeText">
        <dt>補充說明</dt>
        <dd class="free-text">{{ preference.freeText }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.profile {
  padding: 1.25rem 1.25rem 0.5rem;
  border: 1px solid #ebe3d6;
  border-radius: 16px;
  background: #fff;
}

.profile-title {
  margin: 0;
  color: var(--wh-ink);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
}

.profile-list {
  margin: 1rem 0 0;
  border-top: 1px solid var(--wh-line);
}

.profile-list > div {
  display: grid;
  grid-template-columns: 6.5rem minmax(0, 1fr);
  gap: 0.75rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--wh-line);
}

.profile-list > div:last-child {
  border-bottom: none;
}

.profile-list dt {
  color: var(--wh-muted);
  font-size: 0.8rem;
  font-weight: 600;
}

.profile-list dd {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.9rem;
  margin: 0;
  color: var(--wh-ink);
  font-size: 0.92rem;
}

.profile-list dd.meters {
  display: grid;
  gap: 0.6rem;
}

/* Rows fill in one after another once the profile appears. */
.meter {
  --row-delay: calc(200ms + var(--row, 0) * 80ms);

  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr) 9rem;
  align-items: start;
  gap: 0.85rem;
}

.meter-label,
.meter-value {
  line-height: 1.3rem;
}

.meter-label {
  font-size: 0.88rem;
}

.meter.is-lead .meter-label {
  font-weight: 700;
}

.meter-bar {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 1.3rem;
}

.meter-bar > span {
  flex: 1;
  height: 0.45rem;
  border-radius: 2px;
  background: var(--wh-cream);
}

.meter-bar > .is-on {
  background: var(--wh-gold);
  animation: segment-fill 260ms ease-out both;
  animation-delay: calc(var(--row-delay) + var(--n) * 35ms);
}

/* Style ratings are two-ended (輕盈 … 厚重), so they get a marker rather than a fill. */
.scale-track {
  position: relative;
  display: block;
  height: 1.3rem;
}

.scale-track::before {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 2px;
  margin-top: -1px;
  border-radius: 1px;
  background: var(--wh-cream);
  content: '';
}

.scale-dot {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: var(--pos);
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid #fff;
  border-radius: 50%;
  background: var(--wh-ink-soft);
  box-shadow: 0 0 0 1px var(--wh-ink-soft);
  transform: translate(-50%, -50%);
  animation: dot-settle 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--row-delay);
}

.scale-ends {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--wh-faint);
  font-size: 0.68rem;
  line-height: 1.2;
}

.meter-value {
  color: var(--wh-muted);
  font-size: 0.78rem;
  white-space: nowrap;
}

.meter-value strong {
  display: inline-block;
  min-width: 1.4em;
  color: var(--wh-ink);
  font-size: 0.92rem;
  font-variant-numeric: tabular-nums;
}

.muted {
  color: var(--wh-faint);
}

.profile-list dd.free-text {
  display: block;
  white-space: pre-line;
  overflow-wrap: anywhere;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .profile {
    padding: 1rem 1rem 0.25rem;
  }

  .profile-list > div {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }

  .meter {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'label value'
      'bar bar';
    gap: 0.3rem 0.75rem;
  }

  .meter-label {
    grid-area: label;
  }

  .meter-bar,
  .meter-scale {
    grid-area: bar;
  }

  .meter-value {
    grid-area: value;
  }
}

@keyframes segment-fill {
  from {
    background-color: var(--wh-cream);
  }
}

/* Starts at 適中 (the middle) and settles toward the chosen end. */
@keyframes dot-settle {
  from {
    left: 50%;
    opacity: 0;
  }

  30% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .meter-bar > .is-on,
  .scale-dot {
    animation: none;
  }
}
</style>
