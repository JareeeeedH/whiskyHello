<script setup lang="ts">
import { computed } from 'vue'
import { parseCriticReview, splitParagraphs } from '../utils/criticReviewParser'

const props = defineProps<{
  text: string
}>()

const sections = computed(() => parseCriticReview(props.text))
</script>

<template>
  <div v-if="sections" class="critic-body">
    <section
      v-for="(section, index) in sections"
      :key="index"
      class="critic-section"
      :class="{ 'is-intro': section.key === 'unknown' }"
    >
      <h3 v-if="section.label" class="critic-label">
        <span class="label-main">{{ section.label }}</span>
        <span v-if="section.qualifier" class="label-qualifier">{{ section.qualifier }}</span>
        <span class="label-en" lang="en">{{ section.labelEn }}</span>
      </h3>
      <p
        v-for="(paragraph, paragraphIndex) in splitParagraphs(section.content)"
        :key="paragraphIndex"
        class="critic-text"
      >{{ paragraph }}</p>
    </section>
  </div>
  <div v-else class="critic-body critic-plain">{{ text }}</div>
</template>

<style scoped>
.critic-body {
  font-family: var(--font-body);
  color: #334155;
}

.critic-plain {
  font-size: 1rem;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.critic-section {
  padding: 0.85rem 0;
  border-bottom: 1px solid #ece9e4;
}

.critic-section:first-child {
  padding-top: 0.15rem;
}

.critic-section:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.critic-label {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.55rem;
  margin: 0 0 0.4rem;
  font-family: var(--font-body);
  font-weight: 600;
  line-height: 1.4;
}

.label-main {
  font-size: 0.875rem;
  letter-spacing: 0.14em;
  color: #1c1917;
}

.label-qualifier {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #78716c;
}

.label-en {
  font-size: 0.6875rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #a8a29e;
}

.critic-text {
  margin: 0;
  font-size: 1rem;
  line-height: 1.85;
  white-space: pre-wrap;
  word-break: break-word;
}

.critic-text + .critic-text {
  margin-top: 0.75rem;
}

.is-intro .critic-text {
  color: #57534e;
}
</style>
