<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import WhiskyCard from '../components/WhiskyCard.vue'
import type { Whisky } from '../types/whisky'
import {
  getRandomWhiskies,
  searchWhiskies,
} from '../services/whiskyService'

/** Legacy SearchArea defaults — search behavior unchanged */
const searchQuery = ref('macallan')
const searchPoints = ref<number | null>(80)
const pointGreaterThan = ref(true)

const displayList = ref<Whisky[]>(getRandomWhiskies(5))
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
    <header class="page-header">
      <h1>搜尋威士忌</h1>
      <p class="lead">搜尋酒款，查看知名評論家評分與評論</p>
    </header>

    <section class="search-area" aria-label="搜尋條件">
      <label class="field name-field">
        <span class="label">酒款名稱</span>
        <InputText
          v-model="searchQuery"
          placeholder="輸入酒款名稱，例如 Macallan、Ardbeg..."
          class="search-input"
        />
      </label>

      <div class="score-row">
        <label class="field points-field">
          <span class="label">最低分數</span>
          <InputNumber
            v-model="searchPoints"
            placeholder="80"
            class="points-input"
            :min="0"
            :max="100"
          />
        </label>

        <label class="compare">
          <Checkbox v-model="pointGreaterThan" binary input-id="point-gte" />
          <span>{{ pointGreaterThan ? '≥' : '=' }}</span>
        </label>

        <Button label="搜尋" icon="pi pi-search" @click="onSearch" />
      </div>
    </section>

    <p v-if="warningMessage" class="warning">
      {{ warningMessage }} / 請搜尋至少三個字
    </p>

    <section v-if="!isSearch" class="results-section">
      <div class="section-heading">
        <h2>探索酒款</h2>
        <p class="section-desc">發現一些值得認識的威士忌</p>
      </div>
      <div class="card-grid">
        <WhiskyCard
          v-for="item in displayList"
          :key="item.id"
          :whisky="item"
        />
      </div>
    </section>

    <section v-else class="results-section">
      <div class="section-heading">
        <h2>搜尋結果</h2>
        <p v-if="!warningMessage" class="section-desc">共 {{ matchedNumber }} 款</p>
      </div>

      <div v-if="displayList.length !== 0" class="card-grid">
        <WhiskyCard
          v-for="item in displayList"
          :key="item.id"
          :whisky="item"
        />
      </div>
      <p v-else class="empty">沒有符合的酒款，請試試其他名稱或分數條件。</p>
    </section>
  </main>
</template>

<style scoped>
.whisky-view {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem 2rem;
}

.page-header {
  margin-bottom: 1.25rem;
}

.page-header h1 {
  margin: 0 0 0.35rem;
  font-size: 1.75rem;
}

.lead {
  margin: 0;
  color: #64748b;
}

.search-area {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-bottom: 1.25rem;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.name-field {
  width: 100%;
}

.label {
  font-size: 0.875rem;
  color: #475569;
}

.score-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
}

.points-field {
  width: 7.5rem;
}

.search-input,
.points-input,
:deep(.p-inputnumber) {
  width: 100%;
}

.compare {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.5rem;
  color: #334155;
  font-weight: 600;
}

.warning {
  margin: 0 0 0.75rem;
  color: #dc2626;
}

.section-heading {
  margin-bottom: 0.85rem;
}

.section-heading h2 {
  margin: 0 0 0.25rem;
  font-size: 1.125rem;
}

.section-desc {
  margin: 0;
  color: #64748b;
  font-size: 0.9375rem;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

.empty {
  margin: 0;
  padding: 1.25rem 0;
  color: #64748b;
}

@media (max-width: 640px) {
  .whisky-view {
    padding: 1rem;
  }

  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
  }

  .points-field {
    width: 6.5rem;
  }
}
</style>
