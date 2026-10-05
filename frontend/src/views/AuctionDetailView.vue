<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Dialog from 'primevue/dialog'
import {
  AuctionApiError,
  createAuctionBid,
  fetchAuctionBids,
  fetchAuctionById,
} from '../services/auctionService'
import { getWhiskyById } from '../services/whiskyService'
import { useAuthStore } from '../stores/auth'
import type { AuctionStatus } from '../types/admin'
import type { PublicAuctionDetail, PublicBid } from '../types/auction'

/** Display-only hint; the backend enforces the real minimum bid. */
const BID_INCREMENT = 100

const route = useRoute()
const authStore = useAuthStore()

const auction = ref<PublicAuctionDetail | null>(null)
const loading = ref(true)
const notFound = ref(false)
const errorMessage = ref('')

const bids = ref<PublicBid[]>([])
const currentPrice = ref(0)
const bidsLoading = ref(false)
const bidsError = ref('')

const bidAmount = ref<number | null>(null)
const bidSubmitting = ref(false)
const bidError = ref('')
const bidSuccess = ref('')
const confirmVisible = ref(false)
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined

const auctionId = computed(() => String(route.params.id ?? ''))

const isAuthenticated = computed(() => authStore.isAuthenticated)

const canBid = computed(() => auction.value?.status === 'active')
const auctionTarget = computed(() => auction.value ? new Date(auction.value.status === 'scheduled' ? auction.value.startAt : auction.value.endAt).getTime() : 0)
const countdownParts = computed(() => {
  const seconds = Math.max(0, Math.floor((auctionTarget.value - now.value) / 1000))
  return [Math.floor(seconds / 86400), Math.floor((seconds % 86400) / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
})
const countdownLabel = computed(() => auction.value?.status === 'scheduled' ? '距離開標' : '距離結標')
const leadingBidder = computed(() => [...bids.value].sort((a, b) => b.amount - a.amount)[0])
const isLeadingBidder = computed(() => Boolean(authStore.user?.id && leadingBidder.value?.userId === authStore.user.id))

const minimumBid = computed(() => {
  if (!auction.value) {
    return 0
  }
  return bids.value.length > 0
    ? currentPrice.value + BID_INCREMENT
    : auction.value.startingPrice
})

const loginRoute = computed(() => ({
  name: 'login',
  query: { redirect: route.fullPath },
}))

const whisky = computed(() =>
  auction.value ? getWhiskyById(auction.value.whiskyId) : undefined,
)

const whiskyName = computed(
  () =>
    whisky.value?.name?.trim() ||
    (auction.value ? `酒款 #${auction.value.whiskyId}` : ''),
)

const statusLabel: Record<AuctionStatus, string> = {
  draft: '草稿',
  scheduled: '即將開始',
  active: '進行中',
  ended: '已結束',
  cancelled: '已取消',
}

function formatAbsoluteTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('zh-TW').format(value)
}

function resetBidForm() {
  bidAmount.value = minimumBid.value
  bidError.value = ''
}

async function loadBids(id: string) {
  bidsLoading.value = true
  bidsError.value = ''

  try {
    const result = await fetchAuctionBids(id)
    bids.value = result.bids
    currentPrice.value = result.currentPrice
    resetBidForm()
  } catch (error) {
    bids.value = []
    bidsError.value =
      error instanceof AuctionApiError
        ? error.message
        : '無法載入出價紀錄，請稍後再試'
  } finally {
    bidsLoading.value = false
  }
}

function requestBidConfirmation() {
  if (bidSubmitting.value || !auction.value) {
    return
  }

  bidError.value = ''
  bidSuccess.value = ''

  if (bidAmount.value === null) {
    bidError.value = '請輸入出價金額'
    return
  }

  confirmVisible.value = true
}

async function submitBid() {
  if (bidSubmitting.value || !auction.value || bidAmount.value === null) return
  const amount = bidAmount.value
  confirmVisible.value = false

  bidSubmitting.value = true

  try {
    const result = await createAuctionBid(auction.value.id, { amount })
    bids.value = [result.bid, ...bids.value.filter((bid) => bid.id !== result.bid.id)]
    currentPrice.value = result.currentPrice
    resetBidForm()
    bidSuccess.value = '出價成功'
  } catch (error) {
    if (error instanceof AuctionApiError) {
      if (error.status === 400 && error.details.length > 0) {
        bidError.value = error.details.join('；')
      } else if (error.status === 401) {
        bidError.value = '登入已失效，請重新登入後再試'
      } else {
        bidError.value = error.message
      }
    } else {
      bidError.value = '出價失敗，請稍後再試'
    }
  } finally {
    bidSubmitting.value = false
  }
}

async function loadAuction(id: string) {
  loading.value = true
  notFound.value = false
  errorMessage.value = ''
  auction.value = null
  bids.value = []
  currentPrice.value = 0
  bidsError.value = ''
  bidError.value = ''
  bidSuccess.value = ''

  if (!id) {
    notFound.value = true
    loading.value = false
    return
  }

  try {
    auction.value = await fetchAuctionById(id)
    void loadBids(id)
  } catch (error) {
    if (
      error instanceof AuctionApiError &&
      (error.status === 404 || error.status === 400)
    ) {
      notFound.value = true
    } else {
      errorMessage.value =
        error instanceof AuctionApiError
          ? error.message
          : '無法載入競標資訊，請稍後再試'
    }
  } finally {
    loading.value = false
  }
}

watch(
  auctionId,
  (id) => {
    void loadAuction(id)
  },
  { immediate: true },
)

clock = setInterval(() => { now.value = Date.now() }, 1000)
onUnmounted(() => { if (clock) clearInterval(clock) })
</script>

<template>
  <main class="detail">
    <p v-if="!notFound" class="back">
      <RouterLink to="/auctions">← 返回競標列表</RouterLink>
    </p>

    <p v-if="loading" class="state" role="status">載入競標資訊中…</p>

    <section v-else-if="notFound" class="not-found">
      <h1>Auction not found</h1>
      <p>找不到這場競標，可能尚未開放或已不存在。</p>
      <RouterLink to="/auctions">← 返回競標列表</RouterLink>
    </section>

    <section v-else-if="errorMessage" class="error-state" role="alert">
      <p>{{ errorMessage }}</p>
      <Button
        label="重新載入"
        severity="secondary"
        @click="loadAuction(auctionId)"
      />
    </section>

    <template v-else-if="auction">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">WHISKYHELLO · AUCTION HOUSE</p>
          <div class="hero-title-row">
            <span class="status-badge" :class="`is-${auction.status}`"><span class="status-dot" />{{ statusLabel[auction.status] }}</span>
            <span class="lot-number">LOT {{ auction.id.slice(-6).toUpperCase() }}</span>
          </div>
          <h1>{{ auction.title }}</h1>
          <p class="whisky-line"><RouterLink v-if="whisky" :to="{ name: 'whisky-detail', params: { id: whisky.id } }">{{ whiskyName }}</RouterLink><span v-else>{{ whiskyName }}</span></p>
          <p v-if="whisky?.subtitle" class="subtitle">{{ whisky.subtitle }}</p>
        </div>
        <div class="image-wrap">
          <img
            v-if="whisky?.imageUrl"
            :src="whisky.imageUrl"
            :alt="whiskyName"
            class="image"
          />
          <div v-else class="image-fallback">No image</div>
        </div>

      </section>

      <div class="auction-layout">
      <section class="bid-panel">
        <div class="panel-topline"><span>{{ auction.status === 'ended' ? 'FINAL PRICE' : 'CURRENT BID' }}</span><span class="currency">NTD</span></div>

        <p v-if="bidsLoading" class="state" role="status">載入出價紀錄中…</p>

        <div v-else-if="bidsError" class="error-state" role="alert">
          <p>{{ bidsError }}</p>
          <Button
            label="重新載入"
            severity="secondary"
            @click="loadBids(auction.id)"
          />
        </div>

        <template v-else>
          <div class="price-block current-price">
            <span class="currency-symbol">NT$</span><span class="price-value">{{ formatPrice(currentPrice) }}</span>
            <span class="price-note">
              {{ bids.length > 0 ? `共 ${bids.length} 筆出價` : '尚無出價，以起標價計' }}
            </span>
          </div>
          <div v-if="isLeadingBidder && auction.status === 'active'" class="leading-note" role="status">目前由您領先</div>
          <div v-if="auction.status === 'ended' && bids.length > 0" class="winner-card"><span>WINNING BIDDER</span><strong>{{ leadingBidder?.bidderName || '會員' }}</strong><small>本場競標已結束</small></div>

          <template v-if="canBid">
            <form
              v-if="isAuthenticated"
              class="bid-form"
              @submit.prevent="requestBidConfirmation"
            >
              <label class="field-label" for="bid-amount">出價金額</label>
              <p class="bid-hint">目前最低可出價：<strong>NT$ {{ formatPrice(minimumBid) }}</strong></p>
              <div class="bid-row">
                <InputNumber
                  v-model="bidAmount"
                  input-id="bid-amount"
                  class="bid-input"
                  :min="0"
                  :disabled="bidSubmitting"
                />
                <Button
                  type="submit"
                  :label="bidSubmitting ? '出價中…' : '出價'"
                  :loading="bidSubmitting"
                  class="submit-btn"
                />
              </div>
              <p v-if="bidError" class="form-error" role="alert">{{ bidError }}</p>
              <p v-if="bidSuccess" class="form-success" role="status">{{ bidSuccess }}</p>
            </form>

            <p v-else class="login-hint">
              <RouterLink :to="loginRoute">登入</RouterLink>後即可參與出價。
            </p>
          </template>

          <p v-else-if="auction.status === 'scheduled'" class="empty">
            競標尚未開始，將於
            <time :datetime="auction.startAt">{{ formatAbsoluteTime(auction.startAt) }}</time>
            開放出價。
          </p>

          <p v-else class="empty">此競標目前不開放出價。</p>
        </template>
        <div class="time-strip">
          <div class="countdown-block" :class="{ 'is-live': canBid }"><span>{{ countdownLabel }}</span><strong v-if="auction.status === 'active' || auction.status === 'scheduled'" class="countdown-values"><b>{{ String(countdownParts[0]).padStart(2, '0') }}</b><i>天</i><b>{{ String(countdownParts[1]).padStart(2, '0') }}</b><i>時</i><b>{{ String(countdownParts[2]).padStart(2, '0') }}</b><i>分</i><b>{{ String(countdownParts[3]).padStart(2, '0') }}</b><i>秒</i></strong><strong v-else class="ended-caption">{{ statusLabel[auction.status] }}</strong></div>
          <p><span>起標價</span><strong>NT$ {{ formatPrice(auction.startingPrice) }}</strong></p>
        </div>
      </section>

      <section class="block activity-block">
        <div class="section-heading"><div><p class="eyebrow">BIDDING ACTIVITY</p><h2>出價紀錄</h2></div><span v-if="!bidsLoading && !bidsError" class="activity-count">{{ bids.length }} 筆出價</span></div>
        <p v-if="bidsLoading" class="state" role="status">載入出價紀錄中…</p>
        <div v-else-if="bidsError" class="error-state" role="alert"><p>{{ bidsError }}</p><Button label="重新載入" severity="secondary" @click="loadBids(auction.id)" /></div>
        <p v-if="!bidsLoading && !bidsError && bids.length === 0" class="empty">目前還沒有人出價。</p>
        <ul v-else-if="!bidsLoading && !bidsError" class="bid-list">
          <li v-for="bid in bids" :key="bid.id" class="bid-item">
            <span class="bid-name">{{ bid.bidderName || '會員' }}</span>
            <span class="bid-amount">{{ formatPrice(bid.amount) }}</span>
            <time class="bid-time" :datetime="bid.createdAt">
              {{ formatAbsoluteTime(bid.createdAt) }}
            </time>
          </li>
        </ul>
      </section>
      <section class="block date-block" aria-label="競標時間">
        <p><span>開始時間</span><time :datetime="auction.startAt">{{ formatAbsoluteTime(auction.startAt) }}</time></p>
        <p><span>結束時間</span><time :datetime="auction.endAt">{{ formatAbsoluteTime(auction.endAt) }}</time></p>
      </section>
      </div>

      <section class="block">
        <h2>說明</h2>
        <div v-if="auction.description" class="note">{{ auction.description }}</div>
        <p v-else class="empty">目前沒有說明。</p>
      </section>
    </template>
    <Dialog v-model:visible="confirmVisible" modal header="確認出價" :style="{ width: 'min(92vw, 28rem)' }" :draggable="false">
      <div class="confirm-content"><p>您即將為 <strong>{{ auction?.title }}</strong> 提交出價。</p><div><span>您的出價</span><strong>NT$ {{ formatPrice(bidAmount ?? 0) }}</strong></div><small>出價送出後將依競標規則處理，請確認金額正確。</small></div>
      <template #footer><Button label="再想一下" severity="secondary" text @click="confirmVisible = false" /><Button :label="bidSubmitting ? '送出中…' : '確認出價'" :loading="bidSubmitting" class="submit-btn" @click="submitBid" /></template>
    </Dialog>
  </main>
</template>

<style scoped>
.detail { max-width: 1100px; margin: 0 auto; padding: 1.15rem 1.5rem 3rem; color: #292524; }
.back { margin: 0 0 1.2rem; }
.back a, .not-found a, .whisky-line a { color: #9a5b1b; text-decoration: none; }
.back a:hover, .not-found a:hover, .whisky-line a:hover { text-decoration: underline; }
.hero { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 310px; gap: 2.25rem; align-items: center; min-height: 300px; margin-bottom: 1.5rem; padding: 2rem 2.25rem; overflow: hidden; color: #fafaf9; background: radial-gradient(ellipse at 88% 12%, rgba(180,83,9,.22), transparent 46%), linear-gradient(145deg,#1c1917,#292524 68%,#3b2b20); }
.hero::after { position:absolute; inset:auto 0 0; height:1px; content:''; background:linear-gradient(90deg,transparent,#d6a34b,transparent); }
.hero-copy { position:relative; z-index:1; }
.eyebrow { margin:0 0 .8rem; color:#b77932; font-size:.68rem; font-weight:700; letter-spacing:.16em; }
.hero .eyebrow { color:#e7bd73; }
.hero-title-row { display:flex; align-items:center; gap:.85rem; margin-bottom:.55rem; }
.lot-number { color:#a8a29e; font-size:.68rem; letter-spacing:.13em; }
.hero h1 { margin:0 0 .65rem; color:#fafaf9; font-family:var(--font-display); font-size:clamp(1.7rem,3vw,2.35rem); line-height:1.25; }
.hero .whisky-line { color:#e7e5e4; }
.hero .whisky-line a { color:#f5ce8a; }
.whisky-line { margin:0 0 .35rem; font-weight:600; line-height:1.45; }
.subtitle { margin:0; color:#c8c2bb; line-height:1.55; }
.image-wrap { display:flex; align-items:center; justify-content:center; height:250px; padding:1rem; border:1px solid rgba(231,229,228,.18); background:radial-gradient(ellipse at 50% 40%,rgba(255,255,255,.14),rgba(255,255,255,.025) 70%); }
.image { width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 16px 16px rgba(0,0,0,.25)); }
.image-fallback { color:#a8a29e; font-size:.875rem; }
.status-badge { display:inline-flex; align-items:center; padding:.2rem .55rem; border:1px solid rgba(231,229,228,.3); border-radius:99px; color:#d6d3d1; font-size:.72rem; font-weight:600; }
.status-dot { width:.42rem; height:.42rem; margin-right:.4rem; border-radius:50%; background:currentColor; }
.status-badge.is-active { border-color:rgba(74,222,128,.35); color:#86efac; background:rgba(20,83,45,.28); }
.status-badge.is-active .status-dot { animation:live-pulse 1.8s ease-out infinite; }
.status-badge.is-scheduled { border-color:rgba(251,191,36,.35); color:#fcd34d; background:rgba(120,53,15,.25); }
.status-badge.is-ended { border-color:rgba(214,211,209,.3); color:#e7e5e4; }
.status-badge.is-cancelled, .status-badge.is-draft { color:#d6d3d1; }
.auction-layout { display:grid; grid-template-columns:minmax(0, 1.15fr) minmax(300px, .85fr); gap:1rem; align-items:start; }
.bid-panel { padding:1.35rem 1.5rem 1.1rem; border:1px solid #e7dfd3; background:linear-gradient(150deg,#fffefa,#faf7f1); box-shadow:0 12px 35px rgba(41,37,36,.045); }
.panel-topline { display:flex; justify-content:space-between; align-items:center; color:#78716c; font-size:.68rem; font-weight:700; letter-spacing:.15em; }
.currency { color:#a8a29e; }
.price-block { display:flex; flex-wrap:wrap; align-items:baseline; gap:.1rem .55rem; margin:.5rem 0 1rem; }
.currency-symbol { color:#a16207; font-size:.9rem; font-weight:700; }
.price-value { color:#873d1e; font-family:var(--font-body); font-size:clamp(2.5rem,5vw,3.75rem); font-variant-numeric:tabular-nums; font-weight:700; line-height:1.08; }
.price-note { flex-basis:100%; margin-top:.25rem; color:#78716c; font-size:.82rem; }
.leading-note { margin:-.35rem 0 .9rem; color:#166534; font-size:.82rem; font-weight:600; }
.winner-card { display:flex; flex-direction:column; gap:.15rem; margin:.1rem 0 1rem; padding:.8rem 1rem; border-left:3px solid #a16207; background:#f5ebd6; }
.winner-card span { color:#8a5b1e; font-size:.62rem; font-weight:700; letter-spacing:.14em; }
.winner-card strong { color:#292524; font-size:1.1rem; }
.winner-card small { color:#78716c; }
.bid-form { display:flex; flex-direction:column; gap:.5rem; padding:1rem; border:1px solid #e9dfd1; background:#fff; }
.field-label { color:#44403c; font-size:.9rem; font-weight:600; }
.bid-hint { color:#78716c; font-size:.8rem; }
.bid-hint strong { color:#6f381c; }
.bid-row { display:flex; gap:.55rem; align-items:stretch; }
.bid-input { flex:1; min-width:0; }
.bid-input :deep(.p-inputtext) { width:100%; min-height:2.9rem; border-color:#d6d3d1; }
.submit-btn { border:none !important; background:linear-gradient(135deg,#d6a34b,#b77932) !important; color:#21180d !important; font-weight:700 !important; }
.submit-btn:hover { filter:brightness(1.04); }
.form-error, .form-success { margin:0; font-size:.84rem; }
.form-error { color:#b91c1c; }
.form-success { color:#15803d; }
.login-hint, .empty, .state { color:#78716c; line-height:1.65; }
.login-hint a { color:#8a4b21; font-weight:700; }
.time-strip { display:grid; grid-template-columns:1fr auto; gap:.8rem; align-items:center; margin-top:1rem; padding-top:.9rem; border-top:1px solid #e7dfd3; }
.countdown-block { display:flex; flex-direction:column; gap:.2rem; color:#78716c; font-size:.72rem; }
.countdown-values { display:flex; align-items:baseline; gap:.18rem; color:#44403c; font-variant-numeric:tabular-nums; }
.countdown-values b { font-size:1.05rem; }
.countdown-values i { color:#a8a29e; font-size:.65rem; font-style:normal; }
.countdown-block.is-live .countdown-values b { color:#9a3412; }
.ended-caption { color:#78716c; }
.time-strip p { display:flex; flex-direction:column; gap:.15rem; margin:0; color:#78716c; font-size:.7rem; text-align:right; }
.time-strip p strong { color:#44403c; font-size:.85rem; }
.block { min-width:0; margin:0; padding:1.25rem; border:1px solid #e7e5e4; background:#fff; }
.activity-block { grid-column:2; grid-row:1; }
.date-block { grid-column:1/-1; display:flex; flex-wrap:wrap; gap:1.5rem 3rem; }
.date-block p { display:flex; flex-direction:column; gap:.2rem; margin:0; }
.date-block p span { color:#78716c; font-size:.72rem; }
.date-block p time { color:#44403c; font-size:.88rem; }
.section-heading { display:flex; justify-content:space-between; align-items:end; gap:.5rem; margin-bottom:.8rem; }
.section-heading .eyebrow { margin-bottom:.18rem; }
.block h2 { color:#292524; font-family:var(--font-display); font-size:1.25rem; }
.activity-count { color:#78716c; font-size:.75rem; white-space:nowrap; }
.bid-list { max-height:390px; margin:0; padding:0; overflow:auto; list-style:none; }
.bid-item { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:.15rem .75rem; align-items:baseline; padding:.78rem 0; border-bottom:1px solid #f0eeeb; }
.bid-item:last-child { border-bottom:0; }
.bid-name { overflow:hidden; color:#44403c; font-size:.86rem; font-weight:600; text-overflow:ellipsis; white-space:nowrap; }
.bid-amount { color:#873d1e; font-weight:700; font-variant-numeric:tabular-nums; }
.bid-time { grid-column:1/-1; color:#a8a29e; font-size:.73rem; }
.note { color:#57534e; font-size:.95rem; line-height:1.8; white-space:pre-wrap; word-break:break-word; }
.error-state { display:flex; flex-direction:column; align-items:flex-start; gap:.75rem; color:#b91c1c; }
.error-state p { margin:0; }
.confirm-content { display:flex; flex-direction:column; gap:.85rem; color:#57534e; }
.confirm-content p { margin:0; line-height:1.6; }
.confirm-content > div { display:flex; justify-content:space-between; align-items:baseline; padding:.8rem 0; border-top:1px solid #e7e5e4; border-bottom:1px solid #e7e5e4; }
.confirm-content > div strong { color:#873d1e; font-size:1.5rem; font-variant-numeric:tabular-nums; }
.confirm-content small { color:#78716c; line-height:1.5; }
.not-found h1 { margin:0 0 .75rem; }
.not-found p { margin:0 0 1rem; color:#64748b; }
@keyframes live-pulse { 0%{box-shadow:0 0 0 0 rgba(74,222,128,.4)} 100%{box-shadow:0 0 0 6px rgba(74,222,128,0)} }
@media (max-width:800px) { .detail{padding:1rem 1rem 2rem}.hero{grid-template-columns:minmax(0,1fr) 220px;gap:1.2rem;padding:1.5rem}.image-wrap{height:220px}.auction-layout{grid-template-columns:1fr}.activity-block{grid-column:auto;grid-row:auto}.bid-list{max-height:unset} }
@media (max-width:560px) { .hero{grid-template-columns:1fr;gap:1rem;padding:1.2rem}.hero-copy{order:0}.image-wrap{order:1;height:210px}.hero h1{font-size:1.65rem}.bid-panel{padding:1rem}.price-value{font-size:2.75rem}.time-strip{grid-template-columns:1fr}.time-strip p{flex-direction:row;justify-content:space-between;text-align:left}.countdown-values{gap:.16rem}.countdown-values b{font-size:.98rem}.block{padding:1rem}.bid-row{flex-wrap:wrap}.submit-btn{min-height:2.8rem} }
@media (prefers-reduced-motion: reduce) { .status-badge.is-active .status-dot{animation:none} }
</style>
