<script setup lang="ts">
import type { Preference } from '../types/sommelier'
import { FLAVOR_TAG_LABELS } from '../utils/sommelierInput'
import { formatBudget } from '../utils/sommelierConversation'
import {
  COMPANION_LABELS,
  MOOD_LABELS,
  PREFERENCE_OCCASION_LABELS,
  TASTE_LEVEL_LABELS,
  TASTE_LEVEL_STEPS,
} from '../utils/sommelierPreference'

defineProps<{
  preference: Preference
}>()

const LEVEL_SEGMENTS = 3
</script>

<template>
  <section class="profile" aria-labelledby="profile-title">
    <h2 id="profile-title" class="profile-title">你的偏好輪廓</h2>

    <dl class="profile-list">
      <div>
        <dt>想喝到的風味</dt>
        <dd>
          <span v-if="preference.taste.length === 0" class="muted">未指定</span>
          <span v-for="item in preference.taste" :key="item.tag" class="profile-tag is-taste">
            {{ FLAVOR_TAG_LABELS[item.tag] }}
            <span class="level-meter" aria-hidden="true">
              <i
                v-for="n in LEVEL_SEGMENTS"
                :key="n"
                :class="{ 'is-on': n <= TASTE_LEVEL_STEPS[item.level] }"
              />
            </span>
            <span class="level-text">{{ TASTE_LEVEL_LABELS[item.level] }}</span>
          </span>
        </dd>
      </div>
      <div>
        <dt>泥煤與煙燻</dt>
        <dd>
          <template v-if="preference.intensity">
            <span v-if="preference.intensity.peaty !== undefined" class="intensity-item">
              泥煤 <strong>{{ preference.intensity.peaty }}</strong>
            </span>
            <span v-if="preference.intensity.smoky !== undefined" class="intensity-item">
              煙燻 <strong>{{ preference.intensity.smoky }}</strong>
            </span>
          </template>
          <span v-else class="muted">未指定</span>
        </dd>
      </div>
      <div>
        <dt>預算</dt>
        <dd>
          <span v-if="preference.budget">{{ formatBudget(preference.budget) }}</span>
          <span v-else class="muted">未指定</span>
        </dd>
      </div>
      <div v-if="preference.dislikes.length > 0">
        <dt>不想要的風味</dt>
        <dd>
          <span v-for="tag in preference.dislikes" :key="tag" class="profile-tag is-dislike">
            {{ FLAVOR_TAG_LABELS[tag] }}
          </span>
        </dd>
      </div>
      <div>
        <dt>飲酒情境</dt>
        <dd>
          <span v-if="preference.occasion">{{ PREFERENCE_OCCASION_LABELS[preference.occasion] }}</span>
          <span v-else class="muted">未提及</span>
        </dd>
      </div>
      <div>
        <dt>心情</dt>
        <dd>
          <span v-if="preference.mood">{{ MOOD_LABELS[preference.mood] }}</span>
          <span v-else class="muted">未提及</span>
        </dd>
      </div>
      <div>
        <dt>同伴</dt>
        <dd>
          <span v-if="preference.companion">{{ COMPANION_LABELS[preference.companion] }}</span>
          <span v-else class="muted">未提及</span>
        </dd>
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

.profile-tag.is-dislike {
  background: #292524;
  color: #fafaf9;
}

.level-meter {
  display: inline-flex;
  gap: 2px;
}

.level-meter i {
  width: 0.32rem;
  height: 0.7rem;
  border-radius: 1px;
  background: #ead7b4;
}

.level-meter i.is-on {
  background: #b77932;
}

.level-text {
  color: var(--wh-amber);
  font-size: 0.72rem;
}

.intensity-item strong {
  font-variant-numeric: tabular-nums;
}

.muted {
  color: var(--wh-faint);
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
