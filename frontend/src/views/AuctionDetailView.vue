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
import {
  formatAbsoluteTime,
  formatCompactCountdown,
  formatLotNumber,
  formatPrice,
  formatRelativeTime,
  getCountdownParts,
  isEndingSoon,
} from '../utils/auctionDisplay'

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

const bidPanelRef = ref<HTMLElement | null>(null)
const bidPanelInView = ref(true)

const auctionId = computed(() => String(route.params.id ?? ''))

const isAuthenticated = computed(() => authStore.isAuthenticated)

const canBid = computed(() => auction.value?.status === 'active')
const isEnded = computed(() => auction.value?.status === 'ended')
const isScheduled = computed(() => auction.value?.status === 'scheduled')
const auctionTarget = computed(() => auction.value ? new Date(auction.value.status === 'scheduled' ? auction.value.startAt : auction.value.endAt).getTime() : 0)
const countdown = computed(() => getCountdownParts(auctionTarget.value, now.value))
const countdownSegments = computed(() => [
  { value: countdown.value.days, unit: '天' },
  { value: countdown.value.hours, unit: '時' },
  { value: countdown.value.minutes, unit: '分' },
  { value: countdown.value.seconds, unit: '秒' },
])
const countdownLabel = computed(() => auction.value?.status === 'scheduled' ? '距離開標' : '距離結標')
const endingSoon = computed(() => canBid.value && isEndingSoon(countdown.value))
const leadingBidder = computed(() => [...bids.value].sort((a, b) => b.amount - a.amount)[0])
const isSingleEndedBid = computed(() => isEnded.value && bids.value.length === 1)

const minimumBid = computed(() => {
  if (!auction.value) {
    return 0
  }
  return bids.value.length > 0
    ? currentPrice.value + BID_INCREMENT
    : auction.value.startingPrice
})

const priceLabel = computed(() => {
  if (bids.value.length === 0) return '起標價'
  return auction.value?.status === 'ended' ? '成交價' : '目前出價'
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

const imageFailed = ref(false)
watch(() => whisky.value?.imageUrl, () => { imageFailed.value = false })

const statusLabel: Record<AuctionStatus, string> = {
  draft: '草稿',
  scheduled: '即將開始',
  active: '進行中',
  ended: '已結束',
  cancelled: '已取消',
}

const statusCode: Record<AuctionStatus, string> = {
  draft: 'DRAFT',
  scheduled: 'UPCOMING',
  active: 'LIVE',
  ended: 'CLOSED',
  cancelled: 'CANCELLED',
}

function bidderLabel(bid: PublicBid): string {
  return bid.bidderName || '會員'
}

function useMinimumBid() {
  bidAmount.value = minimumBid.value
}

function scrollToBidPanel() {
  bidPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

watch(bidPanelRef, (panel, _previous, onCleanup) => {
  bidPanelInView.value = true
  if (!panel || typeof IntersectionObserver === 'undefined') return
  const observer = new IntersectionObserver(([entry]) => {
    bidPanelInView.value = Boolean(entry?.isIntersecting)
  })
  observer.observe(panel)
  onCleanup(() => observer.disconnect())
})

clock = setInterval(() => { now.value = Date.now() }, 1000)
onUnmounted(() => { if (clock) clearInterval(clock) })
</script>

<template>
  <main class="detail" :class="{ 'has-bid-bar': canBid, 'is-ended': isEnded, 'is-scheduled': isScheduled }">
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
        <header class="hero-copy">
          <div class="lot-meta">
            <span class="status-pill" :class="`is-${auction.status}`">
              <span class="status-dot" aria-hidden="true" />
              <span class="status-code">{{ statusCode[auction.status] }}</span>
              <span class="status-label">{{ statusLabel[auction.status] }}</span>
            </span>
            <span class="lot-number">LOT <b>{{ formatLotNumber(auction.id) }}</b></span>
          </div>
          <h1>{{ auction.title }}</h1>
          <p class="whisky-line">
            <RouterLink v-if="whisky" :to="{ name: 'whisky-detail', params: { id: whisky.id } }">{{ whiskyName }}</RouterLink>
            <span v-else>{{ whiskyName }}</span>
          </p>
          <p v-if="whisky?.subtitle" class="subtitle">{{ whisky.subtitle }}</p>
        </header>

        <figure class="image-stage">
          <img
            v-if="whisky?.imageUrl && !imageFailed"
            :src="whisky.imageUrl"
            :alt="whiskyName"
            class="image"
            @error="imageFailed = true"
          />
          <div v-else class="image-fallback">No image</div>
        </figure>
      </section>

      <div class="auction-layout">
        <section
          ref="bidPanelRef"
          class="bid-panel"
          :class="{ 'is-live': canBid }"
          aria-labelledby="bid-panel-title"
        >
          <div class="panel-head">
            <p id="bid-panel-title" class="panel-label">{{ isEnded ? '成交結果' : priceLabel }}</p>
          </div>

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
            <p v-if="isEnded && !leadingBidder" class="unsold">未達底價</p>
            <p v-else class="price">
              <span class="currency">NT$</span>
              <span class="price-value">{{ formatPrice(currentPrice) }}</span>
            </p>
            <dl v-if="isEnded && leadingBidder" class="winner">
              <dt>得標者</dt>
              <dd>{{ bidderLabel(leadingBidder) }}</dd>
            </dl>
          </template>

          <div
            v-if="auction.status === 'active' || auction.status === 'scheduled'"
            class="countdown"
            :class="{ 'is-soon': endingSoon }"
            :title="canBid ? `結標時間 ${formatAbsoluteTime(auction.endAt)}` : undefined"
          >
            <span class="countdown-label">{{ countdownLabel }}</span>
            <span class="countdown-values" role="timer" :aria-label="`${countdownLabel} ${formatCompactCountdown(countdown)}`">
              <span v-for="segment in countdownSegments" :key="segment.unit" class="segment">
                <b>{{ String(segment.value).padStart(2, '0') }}</b><i>{{ segment.unit }}</i>
              </span>
            </span>
          </div>

          <template v-if="!bidsLoading && !bidsError">
            <template v-if="canBid">
              <form
                v-if="isAuthenticated"
                class="bid-form"
                @submit.prevent="requestBidConfirmation"
              >
                <div class="bid-row">
                  <InputNumber
                    v-model="bidAmount"
                    input-id="bid-amount"
                    aria-label="出價金額"
                    class="bid-input"
                    prefix="NT$ "
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
                <div v-if="bidAmount !== minimumBid" class="form-meta">
                  <button
                    type="button"
                    class="link-btn"
                    :disabled="bidSubmitting"
                    @click="useMinimumBid"
                  >
                    填入最低出價
                  </button>
                </div>
                <p v-if="bidError" class="form-error" role="alert">{{ bidError }}</p>
                <p v-if="bidSuccess" class="form-success" role="status">{{ bidSuccess }}</p>
              </form>

              <div v-else class="login-panel">
                <p>登入後即可參與出價。</p>
                <RouterLink :to="loginRoute" class="login-link">登入出價</RouterLink>
              </div>
            </template>

            <p v-else-if="!isEnded && !isScheduled" class="panel-note">此競標目前不開放出價。</p>
          </template>

          <dl v-if="!isEnded && !isScheduled" class="panel-foot">
            <div><dt>起標價</dt><dd>NT$ {{ formatPrice(auction.startingPrice) }}</dd></div>
            <div><dt>加價級距</dt><dd>NT$ {{ formatPrice(BID_INCREMENT) }}</dd></div>
            <div v-if="canBid && !bidsLoading && !bidsError" class="is-key">
              <dt>最低可出價</dt><dd>NT$ {{ formatPrice(minimumBid) }}</dd>
            </div>
          </dl>
        </section>

        <section v-if="!isScheduled" class="block activity-block" aria-labelledby="activity-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">BIDDING ACTIVITY</p>
              <h2 id="activity-title">出價紀錄</h2>
            </div>
            <span v-if="!isEnded && !bidsLoading && !bidsError" class="activity-count">{{ bids.length }} 筆出價</span>
          </div>
          <p v-if="bidsLoading" class="state" role="status">載入出價紀錄中…</p>
          <div v-else-if="bidsError" class="error-state" role="alert"><p>{{ bidsError }}</p><Button label="重新載入" severity="secondary" @click="loadBids(auction.id)" /></div>
          <p v-else-if="bids.length === 0" class="empty">{{ isEnded ? '本場無人出價。' : '目前還沒有人出價，成為第一位出價者。' }}</p>
          <ol v-else class="bid-list">
            <li
              v-for="bid in bids"
              :key="bid.id"
              class="bid-item"
              :class="{ 'is-top': bid.id === leadingBidder?.id && !isSingleEndedBid }"
            >
              <span class="bid-name">{{ bidderLabel(bid) }}</span>
              <span class="bid-amount"><small>NT$</small>{{ formatPrice(bid.amount) }}</span>
              <time v-if="!isSingleEndedBid" class="bid-time" :datetime="bid.createdAt" :title="formatAbsoluteTime(bid.createdAt)">
                {{ formatRelativeTime(bid.createdAt, now) }}
              </time>
            </li>
          </ol>
        </section>

        <section v-if="auction.status !== 'active' && !isEnded" class="block schedule-block" aria-label="競標時間">
          <p><span>開始時間</span><time :datetime="auction.startAt">{{ formatAbsoluteTime(auction.startAt) }}</time></p>
          <p><span>結束時間</span><time :datetime="auction.endAt">{{ formatAbsoluteTime(auction.endAt) }}</time></p>
        </section>

        <section class="block notes-block">
          <p class="eyebrow">LOT NOTES</p>
          <h2>拍品說明</h2>
          <div v-if="auction.description" class="note">{{ auction.description }}</div>
          <p v-else class="empty">{{ isEnded ? '暫無說明。' : '目前沒有說明。' }}</p>
        </section>
      </div>

      <div v-if="canBid && !bidPanelInView" class="mobile-bid-bar">
        <div class="bar-price">
          <span>{{ priceLabel }}</span>
          <strong>NT$ {{ formatPrice(currentPrice) }}</strong>
        </div>
        <div class="bar-time" :class="{ 'is-soon': endingSoon }">
          <span>剩餘</span>
          <strong>{{ formatCompactCountdown(countdown) }}</strong>
        </div>
        <Button :label="isAuthenticated ? '出價' : '登入出價'" class="submit-btn bar-btn" @click="scrollToBidPanel" />
      </div>
    </template>
    <Dialog v-model:visible="confirmVisible" modal header="確認出價" :style="{ width: 'min(92vw, 28rem)' }" :draggable="false">
      <div class="confirm-content"><p>您即將為 <strong>{{ auction?.title }}</strong> 提交出價。</p><div><span>您的出價</span><strong>NT$ {{ formatPrice(bidAmount ?? 0) }}</strong></div><small>出價送出後將依競標規則處理，請確認金額正確。</small></div>
      <template #footer><Button label="再想一下" severity="secondary" text @click="confirmVisible = false" /><Button :label="bidSubmitting ? '送出中…' : '確認出價'" :loading="bidSubmitting" class="submit-btn" @click="submitBid" /></template>
    </Dialog>
  </main>
</template>

<style scoped>
.detail { max-width: 1120px; margin: 0 auto; padding: 1.15rem 1.5rem 3rem; color: #292524; }
.back { margin: 0 0 1.2rem; font-size: .875rem; }
.back a, .not-found a, .whisky-line a { color: #9a5b1b; text-decoration: none; }
.back a:hover, .not-found a:hover, .whisky-line a:hover { text-decoration: underline; }

/* Hero */
.hero { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 2.25rem; align-items: center; margin-bottom: 1.25rem; padding: 1.75rem 2.25rem; overflow: hidden; color: #fafaf9; background: radial-gradient(ellipse at 88% 12%, rgba(180,83,9,.22), transparent 46%), linear-gradient(145deg, #1c1917, #292524 68%, #3b2b20); }
.hero::after { position: absolute; inset: auto 0 0; height: 1px; content: ''; background: linear-gradient(90deg, transparent, rgba(214,163,75,.6), transparent); }
.hero-copy { position: relative; z-index: 1; min-width: 0; }
.lot-meta { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem 1rem; margin-bottom: .9rem; }
.status-pill { display: inline-flex; align-items: center; gap: .45rem; padding: .25rem .7rem .25rem .6rem; border: 1px solid rgba(214,211,209,.3); color: #d6d3d1; font-size: .7rem; font-weight: 600; line-height: 1.4; }
.status-code { letter-spacing: .16em; }
.status-label { padding-left: .45rem; border-left: 1px solid currentColor; font-weight: 500; opacity: .8; }
.status-dot { width: .42rem; height: .42rem; border-radius: 50%; background: currentColor; }
.status-pill.is-active { border-color: rgba(224,168,74,.5); color: #f5e6c8; background: rgba(224,168,74,.1); }
.status-pill.is-active .status-dot { background: #e0a84a; animation: live-pulse 2s ease-out infinite; }
.status-pill.is-scheduled .status-dot { border: 1px solid currentColor; background: transparent; }
.status-pill.is-ended, .status-pill.is-cancelled, .status-pill.is-draft { color: #a8a29e; }
.lot-number { color: #a8a29e; font-size: .7rem; letter-spacing: .16em; }
.lot-number b { color: #e7e5e4; font-weight: 600; }
.hero-copy h1 { margin: 0 0 .6rem; color: #fafaf9; font-family: var(--font-display); font-size: var(--fs-h1); line-height: 1.25; }
.whisky-line { margin: 0 0 .35rem; color: #e7e5e4; font-weight: 500; line-height: 1.5; }
.hero .whisky-line a { color: #e7bd73; }
.subtitle { margin: 0; color: #a8a29e; font-size: .9rem; line-height: 1.6; }
.image-stage { display: flex; align-items: center; justify-content: center; height: 220px; margin: 0; padding: .9rem; overflow: hidden; border: 1px solid rgba(231,229,228,.16); background: radial-gradient(ellipse at 50% 40%, rgba(255,247,230,.14), rgba(255,255,255,.025) 70%); }
.image { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 14px 14px rgba(0,0,0,.3)); }
.image-fallback { color: #a8a29e; font-size: .875rem; }

/* Bid panel */
.bid-panel { padding: 1.35rem 1.5rem 1.1rem; border: 1px solid #e7dfd3; border-top: 2px solid #b77932; color: #292524; background: #fbf8f2; }
.panel-head { display: flex; justify-content: space-between; align-items: baseline; gap: .75rem; }
.panel-label { margin: 0; color: #8a7f73; font-size: .6875rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; }
.price { display: flex; align-items: baseline; gap: .4rem; margin: .35rem 0 .2rem; }
.currency { color: #a16207; font-size: .8125rem; font-weight: 600; letter-spacing: .06em; }
.price-value { color: #5c260e; font-family: var(--font-body); font-size: clamp(2rem, 3.4vw, 2.5rem); font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -.015em; line-height: 1.1; }
.winner { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; margin: 1.1rem 0 0; padding-top: .85rem; border-top: 1px solid #e7dfd3; }
.winner dt { flex-shrink: 0; color: #8a7f73; font-size: .78rem; letter-spacing: .08em; }
.winner dd { min-width: 0; margin: 0; color: #292524; font-size: 1.05rem; font-weight: 600; text-align: right; overflow-wrap: anywhere; }
.unsold { margin: .5rem 0 0; color: #57534e; font-family: var(--font-display); font-size: 1.5rem; font-weight: 600; line-height: 1.3; }
.countdown { display: flex; justify-content: space-between; align-items: center; gap: .75rem; margin-top: 1.1rem; padding: .8rem 0; border-top: 1px solid #e7dfd3; border-bottom: 1px solid #e7dfd3; }
.countdown-label { color: #78716c; font-size: .78rem; }
.countdown-values { display: flex; gap: .55rem; font-variant-numeric: tabular-nums; }
.segment { display: inline-flex; align-items: baseline; gap: .12rem; }
.segment b { color: #292524; font-size: 1.25rem; font-weight: 600; }
.segment i { color: #a8a29e; font-size: .68rem; font-style: normal; }
.countdown.is-soon .segment b, .countdown.is-soon .countdown-label { color: #9a3412; }
.bid-form { display: flex; flex-direction: column; gap: .5rem; margin-top: 1.1rem; }
.bid-row { display: flex; gap: .55rem; align-items: stretch; }
.bid-input { flex: 1; min-width: 0; }
.bid-input :deep(.p-inputtext) { width: 100%; min-height: 3rem; border-color: #d6cfc4; border-radius: 0; background: #fff; color: var(--wh-ink); font-size: 1.05rem; font-variant-numeric: tabular-nums; }
.bid-input :deep(.p-inputtext::placeholder) { color: var(--wh-muted); opacity: 1; }
.bid-input :deep(.p-inputtext:enabled:focus) { border-color: #b77932; box-shadow: 0 0 0 3px rgba(183,121,50,.15); }
.bid-input :deep(.p-inputtext:disabled) { background: #f5f5f4; color: var(--wh-muted); }
.submit-btn { min-width: 6.5rem; border: none !important; border-radius: 0 !important; background: #1c1917 !important; color: #f5e6c8 !important; font-weight: 600 !important; letter-spacing: .08em !important; transition: background .2s ease; }
.submit-btn:hover { background: #3a2a1d !important; }
.form-meta { display: flex; justify-content: flex-end; line-height: 1.5; }
.link-btn { padding: 0; border: 0; background: none; color: #8a4b21; font-size: .76rem; font-weight: 600; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
.link-btn:disabled { opacity: .5; cursor: default; }
.form-error, .form-success { margin: 0; font-size: .84rem; }
.form-error { color: #b91c1c; }
.form-success { color: #3f6212; }
.login-panel { display: flex; flex-direction: column; gap: .75rem; margin-top: 1.1rem; color: #57534e; font-size: .88rem; line-height: 1.6; }
.login-link { align-self: flex-start; padding: .65rem 1.4rem; background: #1c1917; color: #f5e6c8; font-weight: 600; letter-spacing: .08em; text-decoration: none; transition: background .2s ease; }
.login-link:hover { background: #3a2a1d; }
.login-link:focus-visible, .link-btn:focus-visible { outline: 2px solid #b45309; outline-offset: 2px; }
.panel-note { margin: 1rem 0 0; color: #78716c; font-size: .88rem; line-height: 1.65; }
.panel-foot { display: flex; flex-wrap: wrap; gap: .6rem 2rem; margin: 1.1rem 0 0; padding-top: .8rem; border-top: 1px solid #e7dfd3; }
.panel-foot div { display: flex; flex-direction: column; gap: .1rem; }
.panel-foot dt { color: #a8a29e; font-size: .7rem; }
.panel-foot dd { margin: 0; color: #57534e; font-size: .85rem; font-variant-numeric: tabular-nums; }
.panel-foot .is-key dd { color: #5c260e; font-weight: 600; }
.state { color: #78716c; line-height: 1.65; }
.empty { color: #78716c; line-height: 1.65; }

/* Body */
.auction-layout { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(300px, .9fr); gap: 1.25rem; align-items: stretch; }
.block { min-width: 0; margin: 0; padding: 1.4rem 1.5rem; border: 1px solid #e7e1d8; background: #fff; }
.eyebrow { margin: 0 0 .25rem; color: #a16207; font-size: .66rem; font-weight: 700; letter-spacing: .16em; }
.block h2 { margin: 0 0 .9rem; color: #1c1917; font-family: var(--font-display); font-size: 1.3rem; }
.section-heading { display: flex; justify-content: space-between; align-items: end; gap: .5rem; margin-bottom: .5rem; padding-bottom: .75rem; border-bottom: 1px solid #e7e1d8; }
.section-heading h2 { margin: 0; }
.activity-count { color: #8a7f73; font-size: .78rem; white-space: nowrap; font-variant-numeric: tabular-nums; }
.activity-block { display: flex; flex-direction: column; }
.detail.is-scheduled .bid-panel { grid-column: 1 / -1; }
.detail.is-scheduled .countdown { padding-bottom: 0; border-bottom: 0; }
/* Size containment keeps the list from growing the row: it fills the height set by the bid panel (min ~3 bids) and scrolls. */
.bid-list { flex: 1 1 auto; min-height: 12.75rem; margin: 0; padding: 0; overflow: auto; overscroll-behavior: contain; list-style: none; contain: size; }
.bid-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .1rem 1rem; align-items: baseline; padding: .8rem .85rem; border-bottom: 1px solid #f0ebe3; border-left: 2px solid transparent; }
.bid-item:last-child { border-bottom: 0; }
.bid-name { overflow: hidden; color: #57534e; font-size: .86rem; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.bid-amount { color: #57534e; font-size: .95rem; font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; }
.bid-amount small { margin-right: .2rem; color: #a8a29e; font-size: .66rem; font-weight: 500; }
.bid-time { grid-column: 1 / -1; color: #a8a29e; font-size: .72rem; }
.bid-item.is-top { border-left-color: #c9a46a; background: linear-gradient(90deg, rgba(214,163,75,.12), rgba(214,163,75,0) 80%); }
.bid-item.is-top .bid-name { color: #292524; font-weight: 600; }
.bid-item.is-top .bid-amount { color: #5c260e; font-size: 1.05rem; font-weight: 700; }
.note { color: #57534e; font-size: .95rem; line-height: 1.8; white-space: pre-wrap; word-break: break-word; }
.notes-block { grid-column: 1 / -1; }
.schedule-block { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 1rem 3rem; }
.schedule-block p { display: flex; flex-direction: column; gap: .2rem; margin: 0; }
.schedule-block span { color: #8a7f73; font-size: .78rem; }
.schedule-block time { color: #44403c; font-size: .86rem; font-variant-numeric: tabular-nums; }
.error-state { display: flex; flex-direction: column; align-items: flex-start; gap: .75rem; margin-top: .75rem; color: #b91c1c; }
.error-state p { margin: 0; }

/* Ended: quieter sale record — result panel leads, activity and notes recede */
.detail.is-ended .hero { grid-template-columns: minmax(0, 1fr) 250px; gap: 2rem; padding: 1.5rem 2.25rem; }
.detail.is-ended .image-stage { height: 190px; }
.detail.is-ended .auction-layout { grid-template-columns: minmax(0, 1fr) minmax(300px, 1fr); grid-template-areas: 'result activity' 'notes activity'; gap: 1.25rem 2.5rem; }
.detail.is-ended .bid-panel { grid-area: result; padding: 1.5rem 1.6rem 1.4rem; }
.detail.is-ended .activity-block { grid-area: activity; }
.detail.is-ended .notes-block { grid-area: notes; }
.detail.is-ended .price { margin: .5rem 0 0; }
.detail.is-ended .price-value { font-size: clamp(2.5rem, 4.2vw, 3.25rem); }
.detail.is-ended .activity-block,
.detail.is-ended .notes-block { padding: .9rem 0 0; border: 0; border-top: 1px solid #e7e1d8; background: transparent; }
.detail.is-ended .activity-block .section-heading { margin-bottom: .2rem; padding-bottom: .4rem; border-bottom: 0; }
.detail.is-ended .eyebrow { color: #a8a29e; }
.detail.is-ended .block h2 { margin: 0 0 .5rem; font-size: 1.05rem; }
.detail.is-ended .activity-block .section-heading h2 { margin: 0; }
.detail.is-ended .bid-list { min-height: 0; }
.detail.is-ended .bid-item { padding: .6rem 0; border-left: 0; }
.detail.is-ended .bid-item.is-top { background: none; }
.detail.is-ended .note { font-size: .9rem; line-height: 1.75; }
.detail.is-ended .empty { margin: 0; font-size: .875rem; }

/* Mobile quick-bid bar */
.mobile-bid-bar { display: none; }

.confirm-content { display: flex; flex-direction: column; gap: .85rem; color: #57534e; }
.confirm-content p { margin: 0; line-height: 1.6; }
.confirm-content > div { display: flex; justify-content: space-between; align-items: baseline; padding: .8rem 0; border-top: 1px solid #e7e5e4; border-bottom: 1px solid #e7e5e4; }
.confirm-content > div strong { color: #873d1e; font-size: 1.5rem; font-variant-numeric: tabular-nums; }
.confirm-content small { color: #78716c; line-height: 1.5; }
.not-found h1 { margin: 0 0 .75rem; }
.not-found p { margin: 0 0 1rem; color: #64748b; }
@keyframes live-pulse { 0% { box-shadow: 0 0 0 0 rgba(224,168,74,.55); } 100% { box-shadow: 0 0 0 6px rgba(224,168,74,0); } }

@media (max-width: 800px) {
  .detail { padding: 1rem 1rem 2rem; }
  .hero { grid-template-columns: minmax(0, 1fr) 200px; gap: 1.25rem; padding: 1.5rem; }
  .image-stage { height: 200px; }
  .auction-layout { grid-template-columns: minmax(0, 1fr); }
  .bid-list { flex: none; min-height: 0; max-height: 14.5rem; contain: none; }
  .detail.has-bid-bar { padding-bottom: 4.75rem; }
  .mobile-bid-bar { position: fixed; inset: auto 0 0; z-index: 20; display: flex; align-items: center; gap: 1rem; padding: .7rem 1rem calc(.7rem + env(safe-area-inset-bottom)); border-top: 1px solid rgba(214,163,75,.35); color: #fafaf9; background: rgba(17,14,12,.96); backdrop-filter: blur(8px); }
  .bar-price, .bar-time { display: flex; flex-direction: column; gap: .05rem; min-width: 0; }
  .bar-price { flex: 1; }
  .bar-price span, .bar-time span { color: #a8a29e; font-size: .66rem; letter-spacing: .06em; }
  .bar-price strong { color: #f5e6c8; font-size: 1.1rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .bar-time strong { color: #e7e5e4; font-size: .85rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .bar-time.is-soon strong { color: #f0a36b; }
  .bar-btn { min-height: 2.6rem; background: #d6a34b !important; color: #1c1917 !important; }
  .bar-btn:hover { background: #e0b45f !important; }
  .detail.is-ended .hero { grid-template-columns: minmax(0, 1fr) 180px; gap: 1.25rem; padding: 1.3rem; }
  .detail.is-ended .image-stage { height: 172px; }
  .detail.is-ended .auction-layout { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'result' 'activity' 'notes'; gap: 1.25rem; }
}

@media (max-width: 560px) {
  .hero { grid-template-columns: minmax(0, 1fr) 88px; gap: 1rem; align-items: start; padding: 1.15rem 1rem; }
  .lot-meta { gap: .4rem .75rem; margin-bottom: .65rem; }
  .image-stage { height: 120px; padding: .4rem; }
  .hero-copy h1 { margin-bottom: .4rem; font-size: 1.375rem; }
  .whisky-line { font-size: .875rem; }
  .subtitle { font-size: .78rem; line-height: 1.5; }
  .bid-panel { padding: 1.15rem 1rem 1rem; }
  .price-value { font-size: 2rem; }
  .countdown { flex-direction: column; align-items: flex-start; gap: .35rem; }
  .segment b { font-size: 1.15rem; }
  .block { padding: 1.1rem 1rem; }
  .submit-btn { min-height: 3rem; }
  .detail.is-ended .hero { grid-template-columns: minmax(0, 1fr) 80px; gap: 1rem; padding: 1rem; }
  .detail.is-ended .image-stage { height: 104px; }
  .detail.is-ended .bid-panel { padding: 1.2rem 1rem 1.1rem; }
  .detail.is-ended .activity-block,
  .detail.is-ended .notes-block { padding: .9rem 0 0; }
}

@media (prefers-reduced-motion: reduce) {
  .status-pill.is-active .status-dot { animation: none; }
  .submit-btn, .login-link { transition: none; }
}
</style>
