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
    <section class="discovery-hero" aria-labelledby="whisky-discovery-title">
      <div class="discovery-hero-glow" aria-hidden="true" />
      <div class="discovery-hero-inner">
        <header class="page-header">
          <p class="eyebrow">Whisky Discovery</p>
          <h1 id="whisky-discovery-title">探索威士忌</h1>
          <p class="lead">找到你想喝的那一杯</p>
        </header>
      </div>
    </section>

    <div class="luxury-rule" aria-hidden="true" />

    <div class="whisky-inner">
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
  background: #fafaf9;
}

.discovery-hero {
  position: relative;
  overflow: hidden;
  padding: 1.85rem 1.5rem 1.65rem;
  background:
    radial-gradient(ellipse 70% 90% at 8% 0%, rgba(180, 83, 9, 0.22), transparent 55%),
    radial-gradient(ellipse 50% 70% at 92% 80%, rgba(146, 64, 14, 0.16), transparent 50%),
    linear-gradient(160deg, #0c0a09 0%, #1c1917 48%, #292524 100%);
  color: #fafaf9;
  box-shadow: inset 0 -1px 0 rgba(251, 191, 36, 0.16);
}

.discovery-hero-glow {
  position: absolute;
  inset: auto -10% -50% auto;
  width: 42%;
  height: 90%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.12), transparent 70%);
  pointer-events: none;
}

.discovery-hero-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
}

.luxury-rule {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(180, 83, 9, 0.15) 18%,
    rgba(251, 191, 36, 0.55) 50%,
    rgba(180, 83, 9, 0.15) 82%,
    transparent 100%
  );
}

.whisky-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 1.75rem 1.5rem 3rem;
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
  margin: 0;
  text-align: left;
  max-width: 34rem;
}

.eyebrow {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #fbbf24;
}

.page-header h1 {
  margin: 0 0 0.4rem;
  font-size: clamp(1.7rem, 3.2vw, 2.2rem);
  letter-spacing: -0.03em;
  line-height: 1.22;
  font-weight: 700;
  color: #fafaf9;
}

.lead {
  margin: 0;
  color: #d6d3d1;
  font-size: 1.02rem;
  line-height: 1.6;
}

.search-area {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  margin-bottom: 2rem;
  padding: 1.35rem 1.35rem 1.25rem;
  border: 1px solid rgba(180, 83, 9, 0.2);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, #fafaf9 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.8) inset,
    0 10px 28px rgba(28, 25, 23, 0.04);
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
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, transparent 42%),
    linear-gradient(135deg, #fbbf24 0%, #f59e0b 42%, #d97706 78%, #b45309 100%) !important;
  border: 1px solid rgba(253, 230, 138, 0.55) !important;
  color: #1c1917 !important;
  font-weight: 700 !important;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.28) inset,
    0 -1px 0 rgba(120, 53, 15, 0.3) inset,
    0 8px 18px rgba(28, 25, 23, 0.12) !important;
  transition:
    filter 0.3s ease,
    box-shadow 0.3s ease !important;
}

.search-submit:hover {
  filter: brightness(1.05);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.35) inset,
    0 0 0 1px rgba(253, 230, 138, 0.3),
    0 10px 22px rgba(180, 83, 9, 0.22) !important;
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
  padding-top: 0.85rem;
  border-top: 1px solid rgba(180, 83, 9, 0.14);
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
  padding: 0.38rem 0.78rem;
  border: 1px solid rgba(180, 83, 9, 0.28);
  border-radius: 999px;
  background: #fff;
  color: #44403c;
  font-size: 0.8125rem;
  font-weight: 560;
  cursor: pointer;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset;
  transition:
    border-color 0.22s ease,
    color 0.22s ease,
    background 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.22s ease;
}

.hot-chip:hover {
  border-color: rgba(217, 119, 6, 0.55);
  color: #92400e;
  background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%);
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.2);
  transform: translateY(-1px);
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
  padding-top: 1.15rem;
  border-top: 1px solid rgba(180, 83, 9, 0.14);
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
  .discovery-hero {
    padding: 2.15rem 1.5rem 1.85rem;
  }

  .whisky-inner {
    padding: 2rem 1.5rem 3.5rem;
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
  .discovery-hero {
    padding: 1.45rem 1rem 1.35rem;
  }

  .whisky-inner {
    padding: 1.25rem 1rem 2.5rem;
  }

  .search-area {
    padding: 1.1rem;
  }

  .name-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    flex: 0 0 auto;
    width: 100%;
  }

  .search-submit {
    width: auto;
    align-self: flex-start;
  }

  .points-input,
  :deep(.p-inputnumber) {
    width: 6.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .search-submit,
  .hot-chip {
    transition: none !important;
  }

  .hot-chip:hover {
    transform: none;
  }
}
</style>
