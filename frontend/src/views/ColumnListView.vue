<script setup lang="ts">
import { computed, ref } from 'vue'
import ColumnCard from '../components/ColumnCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { COLUMN_TYPE_LABELS, getColumns } from '../data/columns'
import type { ColumnType } from '../types/column'

const columns = getColumns()

/** Only offer filters for types that have articles. */
const typesInUse = computed(() => {
  const types: ColumnType[] = []
  for (const column of columns) {
    if (!types.includes(column.type)) types.push(column.type)
  }
  return types
})

const activeType = ref<ColumnType | 'all'>('all')

const visibleColumns = computed(() =>
  activeType.value === 'all'
    ? columns
    : columns.filter((column) => column.type === activeType.value),
)
</script>

<template>
  <main class="column-list-view">
    <section class="list-hero" aria-labelledby="columns-title">
      <div class="list-hero-inner">
        <h1 id="columns-title">威士忌專欄</h1>
        <p class="lead">從酒標、木桶到喝法，用好讀的文章認識威士忌。</p>

        <div v-if="typesInUse.length > 1" class="filters" role="group" aria-label="依類型篩選">
          <button
            type="button"
            :class="{ active: activeType === 'all' }"
            :aria-pressed="activeType === 'all'"
            @click="activeType = 'all'"
          >
            全部
          </button>
          <button
            v-for="type in typesInUse"
            :key="type"
            type="button"
            :class="{ active: activeType === type }"
            :aria-pressed="activeType === type"
            @click="activeType = type"
          >
            {{ COLUMN_TYPE_LABELS[type] }}
          </button>
        </div>
      </div>
    </section>

    <section class="list-body" aria-label="文章列表">
      <div class="grid">
        <ColumnCard v-for="column in visibleColumns" :key="column.id" :column="column" />
      </div>
    </section>

    <SiteFooter />
  </main>
</template>

<style scoped>
.column-list-view {
  width: 100%;
  overflow-x: clip;
  background: var(--wh-paper);
  color: var(--wh-ink);
}

.list-hero {
  padding: 2.75rem 1.5rem 2rem;
  background:
    radial-gradient(ellipse 60% 120% at 0% 0%, rgba(220, 184, 120, 0.1), transparent 60%),
    var(--wh-night);
  border-bottom: 1px solid var(--wh-night-line);
  color: var(--wh-cream);
}

.list-hero-inner,
.list-body {
  max-width: 1120px;
  margin: 0 auto;
}

.list-hero h1 {
  margin: 0 0 0.35rem;
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: var(--fw-display);
  line-height: 1.25;
}

.lead {
  margin: 0;
  max-width: 34rem;
  color: var(--wh-mauve);
  font-size: var(--fs-body-sm);
  line-height: 1.7;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.filters button {
  padding: 0.35rem 0.95rem;
  border: 1px solid var(--wh-night-line);
  border-radius: 999px;
  background: transparent;
  color: var(--wh-mauve);
  font-family: var(--font-body);
  font-size: var(--fs-body-sm);
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.filters button:hover {
  color: var(--wh-cream);
  border-color: rgba(220, 184, 120, 0.4);
}

.filters button.active {
  border-color: var(--wh-gold);
  color: var(--wh-gold-bright);
}

.filters button:focus-visible {
  outline: 2px solid var(--wh-gold);
  outline-offset: 2px;
}

.list-body {
  padding: 2.5rem 1.5rem 4.5rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  gap: 1.5rem;
}

@media (max-width: 640px) {
  .list-hero {
    padding: 2.25rem 1.25rem 1.75rem;
  }

  .list-body {
    padding: 1.75rem 1.25rem 3.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .filters button {
    transition: none;
  }
}
</style>
