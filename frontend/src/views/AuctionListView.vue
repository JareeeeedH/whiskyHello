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
          <p class="eyebrow"><span class="eyebrow-mark" aria-hidden="true" />WHISKYHELLO · AUCTION HOUSE</p>
          <h1 id="auction-list-title">珍稀酒款競標</h1>
          <p class="lead">探索值得收藏的酒款，參與每一場競標。</p>
        </header>
        <div
          class="hero-stats"
          :class="{ 'is-pending': loading || errorMessage }"
          aria-label="拍賣場次"
        >
          <div class="is-live"><strong>{{ activeAuctions.length.toString().padStart(2, '0') }}</strong><span>LIVE</span></div>
          <i aria-hidden="true" />
          <div><strong>{{ scheduledAuctions.length.toString().padStart(2, '0') }}</strong><span>UPCOMING</span></div>
        </div>
      </div>
    </section>

    <div class="luxury-rule" aria-hidden="true" />

    <div class="auction-inner">
      <p v-if="loading" class="state" role="status">載入競標列表中…</p>

      <div v-else-if="errorMessage" class="error-state" role="alert">
        <p>{{ errorMessage }}</p>
        <Button label="重新載入" severity="secondary" @click="loadAuctions" />
      </div>

      <template v-else>
        <section class="results-section" aria-labelledby="active-auctions-title">
          <div class="section-heading">
            <div>
              <p class="section-eyebrow is-live"><span aria-hidden="true" />LIVE AUCTIONS</p>
              <h2 id="active-auctions-title">進行中的競標</h2>
            </div>
            <p class="section-desc">共 {{ activeAuctions.length }} 場</p>
          </div>

          <p v-if="activeAuctions.length === 0" class="empty">
            目前沒有進行中的競標，晚點再來看看。
          </p>

          <div v-else class="card-grid">
            <AuctionCard
              v-for="auction in activeAuctions"
              :key="auction.id"
              :auction="auction"
              :price="prices[auction.id] ?? { status: 'loading' }"
            />
          </div>
        </section>

        <section
          class="results-section"
          aria-labelledby="scheduled-auctions-title"
        >
          <div class="section-heading">
            <div>
              <p class="section-eyebrow"><span aria-hidden="true" />UPCOMING</p>
              <h2 id="scheduled-auctions-title">即將開始</h2>
            </div>
            <p class="section-desc">共 {{ scheduledAuctions.length }} 場</p>
          </div>

          <p v-if="scheduledAuctions.length === 0" class="empty">
            目前沒有即將開始的競標。
          </p>

          <div v-else class="card-grid">
            <AuctionCard
              v-for="auction in scheduledAuctions"
              :key="auction.id"
              :auction="auction"
              :price="prices[auction.id] ?? { status: 'starting' }"
            />
          </div>
        </section>

        <section
          class="results-section"
          aria-labelledby="ended-auctions-title"
        >
          <div class="section-heading">
            <div>
              <p class="section-eyebrow"><span aria-hidden="true" />CLOSED</p>
              <h2 id="ended-auctions-title">已結束</h2>
            </div>
            <p class="section-desc">共 {{ endedAuctions.length }} 場</p>
          </div>

          <p v-if="endedAuctions.length === 0" class="empty">
            目前沒有已結束的競標。
          </p>

          <div v-else class="card-grid">
            <AuctionCard
              v-for="auction in endedAuctions"
              :key="auction.id"
              :auction="auction"
              :price="prices[auction.id] ?? { status: 'loading' }"
            />
          </div>
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
    radial-gradient(ellipse 55% 130% at 100% 0%, rgba(180, 83, 9, 0.18), transparent 60%),
    #120f0d;
  color: var(--wh-paper);
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
.hero-stats div { display: flex; align-items: baseline; gap: .5rem; }
.hero-stats strong { color: var(--wh-paper); font-size: 1.5rem; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums; }
.hero-stats .is-live strong { color: #e7bd73; }
.hero-stats span { color: var(--wh-faint); font-size: var(--fs-eyebrow); font-weight: 600; letter-spacing: .18em; }
.hero-stats i { width: 1px; height: 1.1rem; background: rgba(214, 211, 209, .25); }
.eyebrow-mark { display: inline-block; width: 1.5rem; height: 1px; margin: 0 .6rem .22rem 0; background: var(--wh-gold); }

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

.eyebrow {
  display: flex;
  align-items: center;
  margin: 0 0 0.9rem;
  font-family: var(--font-body);
  font-size: var(--fs-eyebrow);
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--wh-gold);
}

.page-header h1 {
  margin: 0 0 0.5rem;
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  letter-spacing: 0.02em;
  line-height: 1.25;
  font-weight: 600;
  color: var(--wh-paper);
}

.lead {
  margin: 0;
  font-family: var(--font-body);
  color: var(--wh-faint);
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

.section-eyebrow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.35rem;
  color: #8a7f73;
  font-size: var(--fs-eyebrow);
  font-weight: 600;
  letter-spacing: 0.16em;
}

.section-eyebrow span {
  width: 1.15rem;
  height: 1px;
  background: #a8a29e;
}

.section-eyebrow.is-live {
  color: #a16207;
}

.section-eyebrow.is-live span {
  background: #d6a34b;
}

.section-heading h2 {
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

  .eyebrow {
    margin-bottom: 0.6rem;
    font-size: 0.625rem;
    letter-spacing: 0.18em;
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
    margin-top: 2.25rem;
  }

  .section-heading {
    margin-bottom: 0.9rem;
    padding-bottom: 0.65rem;
  }
}
</style>
