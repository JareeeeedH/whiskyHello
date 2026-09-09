<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import type { Whisky } from '../types/whisky'
import {
  getRandomWhiskies,
  searchWhiskies,
} from '../services/whiskyService'

/** Legacy SearchArea defaults */
const searchQuery = ref('macallan')
const searchPoints = ref<number | null>(80)
const pointGreaterThan = ref(true)

const displayList = ref<Whisky[]>(getRandomWhiskies(10))
const isSearch = ref(false)
const warningMessage = ref('')

const matchedNumber = computed(() => displayList.value.length)

function onSearch() {
  const result = searchWhiskies({
    query: searchQuery.value,
    points: searchPoints.value,
    pointGreaterThan: pointGreaterThan.value,
  })

  if (result.status === 'too_short') {
    warningMessage.value = 'can not search less than three letter '
    displayList.value = []
    return
  }

  warningMessage.value = ''
  displayList.value = result.items
  isSearch.value = true
}
</script>

<template>
  <main class="whisky-view">
    <h1>WhiskyHello</h1>
    <p class="hint">Whisky search (Data Layer via whiskyService)</p>

    <section class="search-area">
      <InputText v-model="searchQuery" placeholder="title subtitle" class="search-input" />
      <InputNumber v-model="searchPoints" placeholder="points" class="points-input" />
      <label class="gte">
        <Checkbox v-model="pointGreaterThan" binary />
        ≥
      </label>
      <Button label="Search" icon="pi pi-search" @click="onSearch" />
      <span v-if="isSearch" class="matched">matched: {{ matchedNumber }}</span>
    </section>

    <p v-if="warningMessage" class="warning">
      {{ warningMessage }} / 請搜尋至少三個字
    </p>

    <section v-if="!isSearch" class="browse">
      <h2>Random picks</h2>
      <ul>
        <li v-for="item in displayList" :key="item.id">
          <strong>{{ item.name }}</strong>
          <span v-if="item.subtitle"> {{ item.subtitle }}</span>
        </li>
      </ul>
    </section>

    <section v-else class="results">
      <template v-if="displayList.length !== 0">
        <article v-for="item in displayList" :key="item.id" class="card">
          <img
            v-if="item.imageUrl"
            :src="item.imageUrl"
            :alt="item.name"
            class="thumb"
            loading="lazy"
          />
          <div>
            <h3>{{ item.name }}</h3>
            <p v-if="item.subtitle">{{ item.subtitle }}</p>
            <p v-if="item.sgp || item.points !== undefined">
              <span v-if="item.sgp">{{ item.sgp }}</span>
              <span v-if="item.points !== undefined"> — {{ item.points }} points</span>
            </p>
            <p v-if="item.note" class="note">{{ item.note }}</p>
          </div>
        </article>
      </template>
      <h5 v-else>no data / 沒有符合的評論</h5>
    </section>
  </main>
</template>

<style scoped>
.whisky-view {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
}

.hint {
  color: #64748b;
  margin-bottom: 1rem;
}

.search-area {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
}

.search-input {
  min-width: 16rem;
}

.points-input {
  width: 7rem;
}

.gte {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.matched {
  color: #475569;
}

.warning {
  color: red;
}

.browse ul {
  padding-left: 1.25rem;
}

.card {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e2e8f0;
}

.thumb {
  width: 72px;
  height: 72px;
  object-fit: contain;
  flex-shrink: 0;
}

.note {
  font-size: 0.9rem;
  color: #334155;
  white-space: pre-wrap;
}

h1,
h2,
h3,
h5,
p {
  margin: 0 0 0.5rem;
}
</style>
