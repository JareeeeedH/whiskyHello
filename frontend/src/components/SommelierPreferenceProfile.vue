<script setup lang="ts">
import { computed } from 'vue'
import type { SommelierInput } from '../types/sommelier'
import {
  STYLE_KEYS,
  STYLE_LABELS,
  TASTE_KEYS,
  TASTE_LABELS,
  describeTasteLevel,
} from '../utils/sommelierInput'
import { formatBudget } from '../utils/sommelierConversation'
import { PREFERENCE_OCCASION_LABELS } from '../utils/sommelierPreference'

const props = defineProps<{
  preference: SommelierInput
}>()

/** Only the tastes the user picked and rated; the rest are unspecified, not low. */
const ratedTastes = computed(() => TASTE_KEYS.filter((key) => props.preference.taste[key] !== undefined))
</script>

<template>
  <section class="profile" aria-labelledby="profile-title">
    <h2 id="profile-title" class="profile-title">你的偏好輪廓</h2>

    <dl class="profile-list">
      <div>
        <dt>想喝到的風味</dt>
        <dd>
          <span v-for="key in ratedTastes" :key="key" class="profile-tag is-taste">
            {{ TASTE_LABELS[key] }} <strong>{{ preference.taste[key] }}</strong>
            <span class="taste-level">{{ describeTasteLevel(preference.taste[key] ?? 0) }}</span>
          </span>
        </dd>
      </div>
      <div>
        <dt>喝感</dt>
        <dd>
          <span v-for="key in STYLE_KEYS" :key="key" class="rating-item">
            {{ STYLE_LABELS[key] }} <strong>{{ preference.style[key] }}</strong>
          </span>
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

.profile-tag {
  padding: 0.15rem 0.65rem;
  border-radius: 999px;
  font-size: 0.82rem;
}

.profile-tag.is-taste {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid #e3c48f;
  background: #fdf3df;
  color: #6f381c;
}

.taste-level {
  color: #8f5a22;
  font-size: 0.76rem;
}

.profile-tag strong,
.rating-item strong {
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
}
</style>
