<script setup lang="ts">
import type { ColumnBlock } from '../types/column'

defineProps<{ blocks: ColumnBlock[] }>()

/** "**山崎12年**：…" → bold and plain parts; text stays escaped by Vue. */
function splitBold(text: string): { text: string; bold: boolean }[] {
  return text
    .split('**')
    .map((part, index) => ({ text: part, bold: index % 2 === 1 }))
    .filter((part) => part.text !== '')
}
</script>

<template>
  <div class="column-body">
    <template v-for="(block, index) in blocks" :key="index">
      <h2 v-if="block.type === 'heading'">{{ block.text }}</h2>
      <p v-else>
        <template v-for="(part, partIndex) in splitBold(block.text)" :key="partIndex">
          <strong v-if="part.bold">{{ part.text }}</strong>
          <template v-else>{{ part.text }}</template>
        </template>
      </p>
    </template>
  </div>
</template>

<style scoped>
.column-body {
  font-family: var(--font-body);
  font-size: 1.0625rem;
  line-height: 1.95;
  color: var(--wh-ink-soft);
}

.column-body h2 {
  margin: 2.75rem 0 0.85rem;
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-display);
  line-height: 1.45;
  color: var(--wh-ink);
}

.column-body p {
  margin: 0 0 1.15rem;
}

.column-body strong {
  font-weight: var(--fw-emphasis);
  color: var(--wh-ink);
}
</style>
