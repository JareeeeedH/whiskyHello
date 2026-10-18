<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import AuctionCard from '../components/AuctionCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import {
  AuctionApiError,
  fetchAuctionBids,
  fetchAuctions,
} from '../services/auctionService'
import type { AuctionCardPrice, PublicAuctionDetail } from '../types/auction'

const auctions = ref<PublicAuctionDetail[]>([])
const prices = ref<Record<string, AuctionCardPrice>>({})
const loading = ref(true)
const errorMessage = ref('')

const activeAuctions = computed(() =>
  auctions.value.filter((auction) => auction.status === 'active'),
)

const scheduledAuctions = computed(() =>
  auctions.value.filter((auction) => auction.status === 'scheduled'),
)

const endedAuctions = computed(() =>
  auctions.value.filter((auction) => auction.status === 'ended'),
)

type AuctionTab = 'active' | 'scheduled' | 'ended'

/** Mobile shows one status tab at a time, previewing this many cards until expanded. */
const MOBILE_PREVIEW_LIMIT = 3

const activeTab = ref<AuctionTab>('active')
const expandedTabs = ref<Record<AuctionTab, boolean>>({
  active: false,
  scheduled: false,
  ended: false,
})

const statusTabs = computed<{ key: AuctionTab; label: string; count: number }[]>(() => [
  { key: 'active', label: '進行中', count: activeAuctions.value.length },
  { key: 'scheduled', label: '即將開始', count: scheduledAuctions.value.length },
  { key: 'ended', label: '已結束', count: endedAuctions.value.length },
])

function canExpand(tab: AuctionTab, count: number): boolean {
  return count > MOBILE_PREVIEW_LIMIT && !expandedTabs.value[tab]
}

function expandTab(tab: AuctionTab) {
  expandedTabs.value = { ...expandedTabs.value, [tab]: true }
}

let loadToken = 0

function hasBidPrice(auction: PublicAuctionDetail): boolean {
  return auction.status === 'active' || auction.status === 'ended'
}

/** Scheduled auctions cannot have bids yet, so only active and ended ones need a bids request. */
async function loadPrices(list: PublicAuctionDetail[], token: number) {
  await Promise.all(
    list.map(async (auction) => {
      let price: AuctionCardPrice
      try {
        const result = await fetchAuctionBids(auction.id)
        price = {
          status: 'current',
          value: result.currentPrice,
          bidCount: result.bids.length,
        }
      } catch {
        price = { status: 'starting' }
      }
      if (token === loadToken) {
        prices.value = { ...prices.value, [auction.id]: price }
      }
    }),
  )
}

async function loadAuctions() {
  const token = ++loadToken
  loading.value = true
  errorMessage.value = ''
  auctions.value = []
  prices.value = {}

  try {
    const list = await fetchAuctions()
    if (token !== loadToken) {
      return
    }
    auctions.value = list
    prices.value = Object.fromEntries(
      list.map((auction) => [
        auction.id,
        (hasBidPrice(auction)
          ? { status: 'loading' }
          : { status: 'starting' }) as AuctionCardPrice,
      ]),
    )
    void loadPrices(list.filter(hasBidPrice), token)
  } catch (error) {
    if (token !== loadToken) {
      return
    }
    errorMessage.value =
      error instanceof AuctionApiError
        ? error.message
        : '無法載入競標列表，請稍後再試'
  } finally {
    if (token === loadToken) {
      loading.value = false
    }
  }
}

onMounted(() => {
  void loadAuctions()
})
</script>

<template>
  <main class="auction-view">
    <section class="discovery-hero" aria-labelledby="auction-list-title">
      <div class="discovery-hero-inner">
        <header class="page-header">
          <h1 id="auction-list-title">威士忌拍賣，<br />探索稀有與收藏酒款</h1>
          <p class="lead">掌握競標、價格與結標結果，看看威士忌收藏市場正在發生什麼。</p>
        </header>
        <div
          class="hero-stats"
          :class="{ 'is-pending': loading || errorMessage }"
          aria-label="拍賣場次"
        >
          <div class="is-live"><span class="live-dot" aria-hidden="true" /><strong>{{ activeAuctions.length }}</strong><span>場進行中</span></div>
          <i aria-hidden="true" />
          <div><strong>{{ scheduledAuctions.length }}</strong><span>場即將開始</span></div>
        </div>
      </div>
    </section>

    <div class="auction-inner">
      <p v-if="loading" class="state" role="status">載入競標列表中…</p>

      <div v-else-if="errorMessage" class="error-state" role="alert">
        <p>{{ errorMessage }}</p>
        <Button label="重新載入" severity="secondary" @click="loadAuctions" />
      </div>

      <template v-else>
        <div class="status-tabs" role="group" aria-label="競標狀態">
          <button
            v-for="tab in statusTabs"
            :key="tab.key"
            type="button"
            class="status-tab"
            :class="{ 'is-selected': activeTab === tab.key }"
            :aria-pressed="activeTab === tab.key"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}<span class="status-tab-count">{{ tab.count }}</span>
          </button>
        </div>

        <section
          class="results-section"
          :class="{ 'is-tab-hidden': activeTab !== 'active' }"
          aria-labelledby="active-auctions-title"
        >
          <div class="section-heading">
            <h2 id="active-auctions-title">
              <span class="live-dot" aria-hidden="true" />進行中的競標
            </h2>
            <p class="section-desc">共 {{ activeAuctions.length }} 場</p>
          </div>

          <p v-if="activeAuctions.length === 0" class="empty">
            目前沒有進行中的競標，晚點再來看看。
          </p>

          <div
            v-else
            class="card-grid"
            :class="{ 'is-collapsed': !expandedTabs.active }"
          >
            <AuctionCard
              v-for="auction in activeAuctions"
              :key="auction.id"
              :auction="auction"
              :price="prices[auction.id] ?? { status: 'loading' }"
            />
          </div>
          <button
            v-if="canExpand('active', activeAuctions.length)"
            type="button"
            class="show-all"
            @click="expandTab('active')"
          >
            查看全部 {{ activeAuctions.length }} 場
            <i class="pi pi-chevron-down" aria-hidden="true" />
          </button>
        </section>

        <section
          class="results-section"
          :class="{ 'is-tab-hidden': activeTab !== 'scheduled' }"
          aria-labelledby="scheduled-auctions-title"
        >
          <div class="section-heading">
            <h2 id="scheduled-auctions-title">即將開始</h2>
            <p class="section-desc">共 {{ scheduledAuctions.length }} 場</p>
          </div>

          <p v-if="scheduledAuctions.length === 0" class="empty">
            目前沒有即將開始的競標。
          </p>

          <div
            v-else
            class="card-grid"
            :class="{ 'is-collapsed': !expandedTabs.scheduled }"
          >
            <AuctionCard
              v-for="auction in scheduledAuctions"
              :key="auction.id"
              :auction="auction"
              :price="prices[auction.id] ?? { status: 'starting' }"
            />
          </div>
          <button
            v-if="canExpand('scheduled', scheduledAuctions.length)"
            type="button"
            class="show-all"
            @click="expandTab('scheduled')"
          >
            查看全部 {{ scheduledAuctions.length }} 場
            <i class="pi pi-chevron-down" aria-hidden="true" />
          </button>
        </section>

        <section
          class="results-section"
          :class="{ 'is-tab-hidden': activeTab !== 'ended' }"
          aria-labelledby="ended-auctions-title"
        >
          <div class="section-heading">
            <h2 id="ended-auctions-title">已結束</h2>
            <p class="section-desc">共 {{ endedAuctions.length }} 場</p>
          </div>

          <p v-if="endedAuctions.length === 0" class="empty">
            目前沒有已結束的競標。
          </p>

          <div
            v-else
            class="card-grid"
            :class="{ 'is-collapsed': !expandedTabs.ended }"
          >
            <AuctionCard
              v-for="auction in endedAuctions"
              :key="auction.id"
              :auction="auction"
              :price="prices[auction.id] ?? { status: 'loading' }"
            />
          </div>
          <button
            v-if="canExpand('ended', endedAuctions.length)"
            type="button"
            class="show-all"
            @click="expandTab('ended')"
          >
            查看全部 {{ endedAuctions.length }} 場
            <i class="pi pi-chevron-down" aria-hidden="true" />
          </button>
        </section>
      </template>
    </div>

    <SiteFooter />
  </main>
</template>

<style scoped>
.auction-view {
  color: #1c1917;
  width: 100%;
  overflow-x: clip;
  background: #fafaf9;
}

.discovery-hero {
  padding: 3.25rem 1.5rem 2.85rem;
  background:
    radial-gradient(ellipse 55% 130% at 100% 0%, rgba(220, 184, 120, 0.1), transparent 60%),
    var(--wh-night);
  border-bottom: 1px solid var(--wh-night-line);
  color: var(--wh-cream);
}

.discovery-hero-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.4rem;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
}

.hero-stats { display: flex; align-items: center; gap: 1.1rem; transition: opacity .3s ease; }
.hero-stats.is-pending { visibility: hidden; opacity: 0; }
.hero-stats div { display: flex; align-items: baseline; gap: .4rem; }
.hero-stats strong { color: var(--wh-cream); font-size: 1.5rem; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums; }
.hero-stats .is-live strong { color: var(--wh-gold-bright); }
.hero-stats span { color: var(--wh-mauve); font-size: var(--fs-meta); font-weight: 500; }
.hero-stats .is-live .live-dot { align-self: center; margin-right: .15rem; }
.hero-stats i { width: 1px; height: 1.1rem; background: var(--wh-night-line); }

/* Live marker shared by the hero count and the live section heading */
.live-dot {
  display: inline-block;
  flex-shrink: 0;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: #e0a84a;
  animation: live-pulse 2s ease-out infinite;
}

@keyframes live-pulse {
  0% { box-shadow: 0 0 0 0 rgba(224, 168, 74, 0.55); }
  100% { box-shadow: 0 0 0 6px rgba(224, 168, 74, 0); }
}

.auction-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 1.75rem 1.5rem 3rem;
}

.page-header {
  margin: 0;
  text-align: left;
  max-width: 34rem;
}

.page-header h1 {
  margin: 0 0 0.5rem;
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  letter-spacing: 0.02em;
  line-height: 1.25;
  font-weight: 600;
  color: var(--wh-cream);
}

.lead {
  margin: 0;
  font-family: var(--font-body);
  color: var(--wh-mauve);
  font-size: 0.9375rem;
  line-height: 1.7;
  font-weight: 400;
}

.results-section + .results-section {
  margin-top: 3.5rem;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid #e7e1d8;
}

.section-heading h2 {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h2);
  font-weight: 600;
  letter-spacing: normal;
  line-height: 1.35;
}

.section-desc {
  margin: 0;
  font-family: var(--font-body);
  color: #8a7f73;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.state,
.empty {
  margin: 0;
  padding: 2rem 0;
  color: #78716c;
  line-height: 1.6;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 2rem 0;
  color: #b91c1c;
}

.error-state p {
  margin: 0;
}

.status-tabs,
.show-all {
  display: none;
}

@media (max-width: 479px) {
  .card-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}

@media (min-width: 641px) {
  .card-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.15rem;
  }
}

@media (min-width: 801px) {
  .discovery-hero-inner {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 2rem;
  }

  .hero-stats {
    padding-bottom: 0.3rem;
  }
}

@media (min-width: 1024px) {
  .discovery-hero {
    padding: 3.75rem 1.5rem 3.25rem;
  }

  .auction-inner {
    padding: 2.75rem 1.5rem 4rem;
  }

  .card-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.25rem;
  }
}

@media (max-width: 640px) {
  .discovery-hero {
    padding: 1.9rem 1rem 1.6rem;
  }

  .discovery-hero-inner {
    gap: 1.1rem;
  }

  .page-header h1 {
    margin-bottom: 0.35rem;
    font-size: 1.75rem;
  }

  .hero-stats { gap: .85rem; padding-top: 1rem; border-top: 1px solid rgba(214, 211, 209, .14); }
  .hero-stats strong { font-size: 1.25rem; }

  .lead {
    font-size: 0.84rem;
    line-height: 1.6;
  }

  .auction-inner {
    padding: 0.9rem 1rem 2.25rem;
  }

  .results-section + .results-section {
    margin-top: 0;
  }

  .results-section.is-tab-hidden,
  .section-heading {
    display: none;
  }

  .status-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.25rem;
    margin-bottom: 0.9rem;
    padding: 0.25rem;
    border: 1px solid #e7e1d8;
    border-radius: 6px;
    background: #fff;
  }

  .status-tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    min-height: 2.5rem;
    padding: 0 0.4rem;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: #78716c;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 0.2s ease,
      color 0.2s ease;
  }

  .status-tab-count {
    color: #a8a29e;
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }

  .status-tab.is-selected {
    background: #1c1917;
    color: #fafaf9;
  }

  .status-tab.is-selected .status-tab-count {
    color: #e7bd73;
  }

  .status-tab:focus-visible,
  .show-all:focus-visible {
    outline: 2px solid #b45309;
    outline-offset: 2px;
  }

  .card-grid.is-collapsed > :nth-child(n + 4) {
    display: none;
  }

  .show-all {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    width: 100%;
    margin-top: 0.85rem;
    padding: 0.8rem 1rem;
    border: 1px solid rgba(161, 98, 7, 0.45);
    border-radius: 4px;
    background: #fff;
    color: #7a4310;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  .show-all .pi {
    font-size: 0.7rem;
  }

  .show-all:hover {
    border-color: #a16207;
    background: #fbf3e4;
  }
}

@media (prefers-reduced-motion: reduce) {
  .live-dot {
    animation: none;
  }
}

@media (max-width: 640px) and (prefers-reduced-motion: reduce) {
  .status-tab {
    transition: none;
  }
}
</style>
