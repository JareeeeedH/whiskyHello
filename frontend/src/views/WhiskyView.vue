<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import WhiskyCard from '../components/WhiskyCard.vue'
import type { Whisky } from '../types/whisky'
import {
  getRandomWhiskies,
  searchWhiskies,
} from '../services/whiskyService'

/** Score defaults preserve legacy search behavior; query starts empty like homepage. */
const searchQuery = ref('')
const searchPoints = ref<number | null>(80)
const pointGreaterThan = ref(true)

const displayList = ref<Whisky[]>(getRandomWhiskies(10))
const isSearch = ref(false)
const warningMessage = ref('')

const hotSearches = ['Macallan12', 'Ardbeg10', 'Lagavulin16', 'Talisker18'] as const

const matchedNumber = computed(() => displayList.value.length)
const compareOperator = computed(() => (pointGreaterThan.value ? '≥' : '='))

const searchSummary = computed(() => {
  const parts: string[] = []
  const query = searchQuery.value.trim()
  if (query) parts.push(query)
  if (searchPoints.value !== null && searchPoints.value !== undefined) {
    parts.push(`${compareOperator.value} ${searchPoints.value}`)
  }
  return parts.join(' · ')
})

function toggleCompareOperator() {
  pointGreaterThan.value = !pointGreaterThan.value
}

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

function applyHotSearch(term: string) {
  searchQuery.value = term
  onSearch()
}
</script>

<template>
  <main class="whisky-view">
    <div class="whisky-inner">
      <header class="page-header">
        <p class="eyebrow">Whisky Discovery</p>
        <h1>探索威士忌</h1>
        <p class="lead">找到你想喝的那一杯</p>
      </header>

    <section class="search-area" aria-label="搜尋條件">
      <div class="search-primary">
        <label class="field-label" for="whisky-search-name">酒款名稱</label>
        <div class="name-row">
          <InputText
            id="whisky-search-name"
            v-model="searchQuery"
            placeholder="輸入酒款名稱，例如 Macallan..."
            class="search-input"
            @keyup.enter="onSearch"
          />
          <Button
            label="搜尋"
            icon="pi pi-search"
            class="search-submit"
            @click="onSearch"
          />
        </div>
      </div>

      <div class="search-secondary">
        <span class="field-label">最低分數</span>
        <div class="score-row">
          <Button
            type="button"
            class="compare-btn"
            :label="compareOperator"
            severity="secondary"
            outlined
            :aria-label="
              pointGreaterThan
                ? '大於等於，點擊改為剛好等於'
                : '剛好等於，點擊改為大於等於'
            "
            @click="toggleCompareOperator"
          />
          <InputNumber
            v-model="searchPoints"
            input-id="whisky-search-points"
            placeholder="80"
            class="points-input"
            :min="0"
            :max="100"
          />
        </div>
      </div>

      <div class="hot-searches" aria-label="熱門搜尋">
        <span class="hot-label">熱門搜尋</span>
        <div class="hot-list">
          <button
            v-for="term in hotSearches"
            :key="term"
            type="button"
            class="hot-chip"
            @click="applyHotSearch(term)"
          >
            {{ term }}
          </button>
        </div>
      </div>
    </section>

    <p v-if="warningMessage" class="warning" role="alert">
      {{ warningMessage }} / 請搜尋至少三個字
    </p>

    <section v-if="!isSearch" class="results-section">
      <div class="section-heading">
        <h2>探索酒款</h2>
        <p class="section-desc">發現一些你可能還沒喝過的酒。</p>
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
        <p v-if="!warningMessage && searchSummary" class="result-meta">
          {{ searchSummary }}
        </p>
        <p v-if="!warningMessage" class="section-desc">
          找到 {{ matchedNumber }} 款
        </p>
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
    </div>

    <footer class="page-footer">
      <p>WhiskyHello · 從一杯酒開始</p>
    </footer>
  </main>
</template>

<style scoped>
.whisky-view {
  color: #1c1917;
  width: 100%;
  overflow-x: clip;
}

.whisky-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}

.page-footer {
  padding: 1.75rem 1.5rem;
  text-align: center;
  background: #292524;
  color: #a8a29e;
}

.page-footer p {
  margin: 0;
  font-size: 0.875rem;
}

.page-header {
  margin-bottom: 1.75rem;
}

.eyebrow {
  margin: 0 0 0.55rem;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #a8a29e;
}

.page-header h1 {
  margin: 0 0 0.45rem;
  font-size: clamp(1.65rem, 3vw, 2.1rem);
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.lead {
  margin: 0;
  color: #57534e;
  font-size: 1.05rem;
  line-height: 1.6;
}

.search-area {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  margin-bottom: 2rem;
  padding: 1.35rem 1.35rem 1.25rem;
  border: 1px solid #e7e5e4;
  background:
    linear-gradient(180deg, #fff 0%, #fafaf9 100%);
}

.field-label {
  display: block;
  margin-bottom: 0.45rem;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #78716c;
}

.name-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: stretch;
}

.search-input {
  flex: 1 1 16rem;
  min-width: 0;
}

.search-submit {
  flex: 0 0 auto;
}

.search-secondary {
  max-width: 22rem;
}

.score-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
}

.points-input,
:deep(.p-inputnumber) {
  width: 7.5rem;
  flex: 0 0 auto;
}

.compare-btn {
  min-width: 3rem;
  flex-shrink: 0;
}

.hot-searches {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem 0.75rem;
  padding-top: 0.15rem;
  border-top: 1px solid #f0efee;
}

.hot-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #a8a29e;
}

.hot-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.hot-chip {
  padding: 0.35rem 0.7rem;
  border: 1px solid #e7e5e4;
  background: #fff;
  color: #44403c;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
}

.hot-chip:hover {
  border-color: #d6d3d1;
  color: #b45309;
  background: #fffbeb;
}

.hot-chip:focus-visible {
  outline: 2px solid #b45309;
  outline-offset: 2px;
}

.warning {
  margin: -0.75rem 0 1.25rem;
  color: #b91c1c;
  font-size: 0.9rem;
}

.results-section {
  min-height: 18rem;
}

.section-heading {
  margin-bottom: 1.15rem;
}

.section-heading h2 {
  margin: 0 0 0.35rem;
  font-size: clamp(1.2rem, 2.4vw, 1.4rem);
  letter-spacing: -0.01em;
}

.result-meta {
  margin: 0 0 0.25rem;
  color: #b45309;
  font-size: 0.95rem;
  font-weight: 600;
}

.section-desc {
  margin: 0;
  color: #78716c;
  font-size: 0.9375rem;
  line-height: 1.55;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.empty {
  margin: 0;
  padding: 2rem 0;
  color: #78716c;
  line-height: 1.6;
}

@media (min-width: 641px) {
  .card-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }
}

@media (min-width: 1024px) {
  .whisky-inner {
    padding: 2.5rem 1.5rem 3.5rem;
  }

  .card-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.1rem;
  }
}

@media (min-width: 1280px) {
  .card-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .whisky-inner {
    padding: 1.35rem 1rem 2.5rem;
  }

  .search-area {
    padding: 1.1rem;
  }

  .search-submit {
    width: 100%;
  }

  .points-input,
  :deep(.p-inputnumber) {
    width: 6.5rem;
  }
}
</style>
