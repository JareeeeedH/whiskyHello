<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import WhiskyCard from '../components/WhiskyCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import type { Whisky } from '../types/whisky'
import {
  getRandomWhiskies,
  searchWhiskies,
} from '../services/whiskyService'

const searchQuery = ref('')

const displayList = ref<Whisky[]>(getRandomWhiskies(10))
const isSearch = ref(false)
const warningMessage = ref('')

const hotSearches = ['Macallan12', 'Ardbeg10', 'Lagavulin16', 'Talisker18'] as const

const matchedNumber = computed(() => displayList.value.length)
const searchSummary = computed(() => searchQuery.value.trim())

function onSearch() {
  const result = searchWhiskies({ query: searchQuery.value })

  if (result.status === 'too_short') {
    warningMessage.value = '請至少輸入三個字再搜尋'
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
      <div class="discovery-hero-inner">
        <header class="page-header">
          <h1 id="whisky-discovery-title">探索威士忌</h1>
          <p class="lead">找到你想認識的酒，從每一杯開始了解自己的口味。</p>
        </header>

        <div class="search-area" role="search" aria-label="搜尋條件">
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
        </div>
      </div>
    </section>

    <div class="whisky-inner">
    <p v-if="warningMessage" class="warning" role="alert">
      {{ warningMessage }}
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
      <p v-else class="empty">沒有符合的酒款，請試試其他酒款名稱。</p>
    </section>
    </div>

    <SiteFooter />
  </main>
</template>

<style scoped>
.whisky-view {
  color: var(--wh-ink);
  width: 100%;
  overflow-x: clip;
  background: var(--wh-paper);
}

/* ——— Hero: the search itself is the hero ——— */
.discovery-hero {
  padding: 2.25rem 1.5rem 2rem;
  background:
    radial-gradient(ellipse 60% 120% at 0% 0%, rgba(220, 184, 120, 0.1), transparent 60%),
    var(--wh-night);
  border-bottom: 1px solid var(--wh-night-line);
  color: var(--wh-cream);
}

.discovery-hero-inner {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
}

.page-header {
  margin: 0 0 1.5rem;
  max-width: 34rem;
}

.page-header h1 {
  margin: 0 0 0.3rem;
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: var(--fw-display);
  line-height: 1.25;
  color: var(--wh-cream);
}

.lead {
  margin: 0;
  color: var(--wh-mauve);
  font-size: var(--fs-body-sm);
  line-height: 1.7;
}

.search-area {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 46rem;
}

/* Label stays for screen readers; the placeholder and context make it clear visually. */
.field-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.search-primary {
  position: relative;
}

.name-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  border-radius: 8px;
  box-shadow: 0 0 0 1px rgba(220, 184, 120, 0.35);
  transition: box-shadow 0.2s ease;
}

.name-row:focus-within {
  box-shadow: 0 0 0 2px var(--wh-gold-bright);
}

.search-input {
  flex: 1 1 auto;
  min-width: 0;
}

.search-input.p-inputtext {
  min-height: 3.5rem;
  padding: 0 1.1rem;
  border: 0;
  border-radius: 8px 0 0 8px;
  background: #fffdf9;
  color: var(--wh-ink);
  font-size: 1.0625rem;
  box-shadow: none;
}

.search-input.p-inputtext::placeholder {
  color: var(--wh-muted);
  opacity: 1;
}

.search-input.p-inputtext:enabled:focus {
  box-shadow: none;
  outline: none;
}

.search-submit {
  flex: 0 0 auto;
  min-width: 7rem;
  border: 0 !important;
  border-radius: 0 8px 8px 0 !important;
  background: var(--wh-gold-bright) !important;
  color: var(--wh-night) !important;
  font-family: var(--font-body) !important;
  font-weight: var(--fw-emphasis) !important;
  box-shadow: none !important;
}

.search-submit:hover {
  background: var(--wh-gold) !important;
}

.search-submit:focus-visible {
  outline: 2px solid var(--wh-cream);
  outline-offset: -4px;
}

.hot-searches {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}

.hot-label {
  color: var(--wh-mauve);
  font-size: var(--fs-meta);
}

.hot-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.hot-chip {
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--wh-night-line);
  border-radius: 999px;
  background: var(--wh-night-raised);
  color: var(--wh-cream);
  font-family: var(--font-body);
  font-size: var(--fs-meta);
  font-weight: var(--fw-ui);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.hot-chip:hover {
  border-color: rgba(220, 184, 120, 0.5);
  color: var(--wh-gold-bright);
}

.hot-chip:focus-visible {
  outline: 2px solid var(--wh-gold-bright);
  outline-offset: 2px;
}

/* ——— Results ——— */
.whisky-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3.5rem;
}

.warning {
  margin: 0 0 1.25rem;
  padding: 0.7rem 0.9rem;
  border-left: 2px solid #b91c1c;
  background: #fef2f2;
  color: #b91c1c;
  font-size: var(--fs-body-sm);
}

.results-section {
  min-height: 18rem;
}

.section-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.85rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--wh-line);
}

.section-heading h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h2);
  font-weight: var(--fw-display);
  line-height: 1.35;
}

.result-meta {
  margin: 0;
  color: var(--wh-amber);
  font-size: var(--fs-body);
  font-weight: var(--fw-emphasis);
}

.section-desc {
  margin: 0 0 0 auto;
  color: var(--wh-muted);
  font-size: var(--fs-meta);
  font-variant-numeric: tabular-nums;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.empty {
  margin: 0;
  padding: 2rem 0;
  color: var(--wh-muted);
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
    padding: 2.75rem 1.5rem 2.5rem;
  }

  .card-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .card-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .discovery-hero {
    padding: 1.4rem 1rem 1.35rem;
  }

  .page-header {
    margin-bottom: 1rem;
  }

  .page-header h1 {
    font-size: 1.625rem;
  }

  .lead {
    font-size: var(--fs-meta);
    line-height: 1.55;
  }

  .search-area {
    gap: 0.75rem;
  }

  .search-input.p-inputtext {
    min-height: 3rem;
    padding: 0 0.85rem;
    font-size: 1rem;
  }

  .search-submit {
    min-width: 0;
    padding: 0 0.95rem !important;
  }

  .hot-label {
    width: 100%;
  }

  .hot-chip {
    min-height: 2.25rem;
  }

  .whisky-inner {
    padding: 1.25rem 1rem 2.25rem;
  }

  .results-section {
    min-height: 12rem;
  }

  .section-heading {
    margin-bottom: 0.9rem;
  }
}

/* Narrow phones: icon-only search button keeps the input readable. */
@media (max-width: 360px) {
  .search-submit :deep(.p-button-label) {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .name-row,
  .hot-chip {
    transition: none;
  }
}
</style>
