<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import AuctionCard from '../components/AuctionCard.vue'
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

let loadToken = 0

/** Scheduled auctions cannot have bids yet, so only active ones need a bids request. */
async function loadPrices(list: PublicAuctionDetail[], token: number) {
  await Promise.all(
    list.map(async (auction) => {
      let price: AuctionCardPrice
      try {
        const result = await fetchAuctionBids(auction.id)
        price = { status: 'current', value: result.currentPrice }
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
        (auction.status === 'active'
          ? { status: 'loading' }
          : { status: 'starting' }) as AuctionCardPrice,
      ]),
    )
    void loadPrices(
      list.filter((auction) => auction.status === 'active'),
      token,
    )
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
      <div class="discovery-hero-glow" aria-hidden="true" />
      <div class="discovery-hero-inner">
        <header class="page-header">
          <p class="eyebrow"><span class="eyebrow-mark" /> WHISKYHELLO · AUCTION HOUSE</p>
          <h1 id="auction-list-title">珍稀酒款競標</h1>
          <p class="lead">探索值得典藏的酒款，參與每一場精彩競標。</p>
        </header>
        <div class="hero-stats" aria-label="拍賣場次">
          <div><strong>{{ activeAuctions.length.toString().padStart(2, '0') }}</strong><span>LIVE NOW</span></div>
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
            <h2 id="active-auctions-title">進行中的競標</h2>
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
            <h2 id="scheduled-auctions-title">即將開始</h2>
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
      </template>
    </div>

    <footer class="page-footer">
      <p>WhiskyHello · 從一杯酒開始</p>
    </footer>
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

.hero-stats { display:flex; align-items:center; gap:1.25rem; margin-top:1.35rem; color:#d6d3d1; }
.hero-stats div { display:flex; align-items:baseline; gap:.5rem; }
.hero-stats strong { color:#fbbf24; font-size:1.45rem; font-weight:500; font-variant-numeric:tabular-nums; }
.hero-stats span { color:#a8a29e; font-size:.65rem; letter-spacing:.13em; }
.hero-stats i { width:1px; height:1rem; background:rgba(214,211,209,.35); }
.eyebrow-mark { display:inline-block; width:1.15rem; height:1px; margin:0 .45rem .2rem 0; background:#fbbf24; }

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
  font-family: var(--font-body);
  font-size: var(--fs-eyebrow);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #fbbf24;
}

.page-header h1 {
  margin: 0 0 0.4rem;
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  letter-spacing: normal;
  line-height: 1.25;
  font-weight: 600;
  color: #fafaf9;
}

.lead {
  margin: 0;
  font-family: var(--font-body);
  color: #d6d3d1;
  font-size: 1.02rem;
  line-height: 1.7;
  font-weight: 400;
}

.results-section + .results-section {
  margin-top: 2.25rem;
}

.section-heading {
  margin-bottom: 1.15rem;
}

.section-heading h2 {
  margin: 0 0 0.35rem;
  font-family: var(--font-display);
  font-size: var(--fs-h2);
  font-weight: 600;
  letter-spacing: normal;
  line-height: 1.35;
}

.section-desc {
  margin: 0;
  font-family: var(--font-body);
  color: #78716c;
  font-size: 0.9375rem;
  line-height: 1.7;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
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

  .auction-inner {
    padding: 2rem 1.5rem 3.5rem;
  }

  .card-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.1rem;
  }
}

@media (max-width: 640px) {
  .discovery-hero {
    padding: 1rem 1rem 0.9rem;
  }

  .eyebrow {
    margin-bottom: 0.3rem;
    font-size: 0.72rem;
  }

  .page-header h1 {
    margin-bottom: 0.25rem;
    font-size: 1.875rem;
  }

  .hero-stats { margin-top:.9rem; gap:.85rem; }
  .hero-stats strong { font-size:1.2rem; }
  .hero-stats span { font-size:.58rem; }

  .lead {
    font-size: 0.875rem;
    line-height: 1.55;
  }

  .auction-inner {
    padding: 0.9rem 1rem 2.25rem;
  }

  .results-section + .results-section {
    margin-top: 1.75rem;
  }
}
</style>
