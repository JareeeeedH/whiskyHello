<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
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

const auctionId = computed(() => String(route.params.id ?? ''))

const isAuthenticated = computed(() => authStore.isAuthenticated)

const canBid = computed(() => auction.value?.status === 'active')

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
  scheduled: '已排程',
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

async function submitBid() {
  if (bidSubmitting.value || !auction.value) {
    return
  }

  bidError.value = ''
  bidSuccess.value = ''

  if (bidAmount.value === null) {
    bidError.value = '請輸入出價金額'
    return
  }

  const amount = bidAmount.value
  if (!window.confirm(`確定要出價 ${formatPrice(amount)} 嗎？`)) {
    return
  }

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
        <div class="image-wrap">
          <img
            v-if="whisky?.imageUrl"
            :src="whisky.imageUrl"
            :alt="whiskyName"
            class="image"
          />
          <div v-else class="image-fallback">No image</div>
        </div>

        <div class="summary">
          <span class="status-badge" :class="`is-${auction.status}`">
            {{ statusLabel[auction.status] }}
          </span>
          <h1>{{ auction.title }}</h1>
          <p class="whisky-line">
            <RouterLink
              v-if="whisky"
              :to="{ name: 'whisky-detail', params: { id: whisky.id } }"
            >
              {{ whiskyName }}
            </RouterLink>
            <span v-else>{{ whiskyName }}</span>
          </p>
          <p v-if="whisky?.subtitle" class="subtitle">{{ whisky.subtitle }}</p>

          <div class="price-block">
            <span class="price-label">起標價</span>
            <span class="price-value">{{ formatPrice(auction.startingPrice) }}</span>
          </div>
        </div>
      </section>

      <section class="block">
        <h2>競標時間</h2>
        <div class="meta-list">
          <p>
            <span class="meta-label">開始</span>
            <time :datetime="auction.startAt">{{ formatAbsoluteTime(auction.startAt) }}</time>
          </p>
          <p>
            <span class="meta-label">結束</span>
            <time :datetime="auction.endAt">{{ formatAbsoluteTime(auction.endAt) }}</time>
          </p>
        </div>
      </section>

      <section class="block">
        <h2>目前價格</h2>

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
            <span class="price-value">{{ formatPrice(currentPrice) }}</span>
            <span class="price-note">
              {{ bids.length > 0 ? `共 ${bids.length} 筆出價` : '尚無出價，以起標價計' }}
            </span>
          </div>

          <template v-if="canBid">
            <form
              v-if="isAuthenticated"
              class="bid-form"
              @submit.prevent="submitBid"
            >
              <label class="field-label" for="bid-amount">出價金額</label>
              <p class="bid-hint">目前最低可出價：{{ formatPrice(minimumBid) }}</p>
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

          <p v-else class="empty">此競標目前不開放出價。</p>
        </template>
      </section>

      <section v-if="!bidsLoading && !bidsError" class="block">
        <h2>出價紀錄</h2>
        <p v-if="bids.length === 0" class="empty">目前還沒有人出價。</p>
        <ul v-else class="bid-list">
          <li v-for="bid in bids" :key="bid.id" class="bid-item">
            <span class="bid-name">{{ bid.bidderName || '會員' }}</span>
            <span class="bid-amount">{{ formatPrice(bid.amount) }}</span>
            <time class="bid-time" :datetime="bid.createdAt">
              {{ formatAbsoluteTime(bid.createdAt) }}
            </time>
          </li>
        </ul>
      </section>

      <section class="block">
        <h2>說明</h2>
        <div v-if="auction.description" class="note">{{ auction.description }}</div>
        <p v-else class="empty">目前沒有說明。</p>
      </section>
    </template>
  </main>
</template>

<style scoped>
.detail {
  max-width: 880px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem 2.5rem;
}

.back {
  margin: 0 0 1.25rem;
}

.back a,
.not-found a,
.whisky-line a {
  color: #0f766e;
  text-decoration: none;
}

.hero {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1.5rem;
  align-items: start;
  margin-bottom: 1.75rem;
}

.image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 260px;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-fallback {
  color: #94a3b8;
  font-size: 0.875rem;
}

.summary h1 {
  margin: 0.6rem 0 0.5rem;
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 3vw, 1.75rem);
  font-weight: 600;
  line-height: 1.28;
  letter-spacing: normal;
  color: #0f172a;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.5rem;
  border: 1px solid #e7e5e4;
  border-radius: 0.35rem;
  color: #78716c;
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.status-badge.is-active {
  border-color: rgba(21, 128, 61, 0.3);
  color: #15803d;
  background: #f0fdf4;
}

.status-badge.is-scheduled {
  border-color: rgba(217, 119, 6, 0.35);
  color: #b45309;
  background: #fffbeb;
}

.whisky-line {
  margin: 0 0 0.35rem;
  font-family: var(--font-body);
  font-weight: 600;
  color: #334155;
  line-height: 1.45;
}

.subtitle {
  margin: 0 0 1rem;
  font-family: var(--font-body);
  color: #64748b;
  line-height: 1.55;
  font-weight: 400;
}

.price-block {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.price-label {
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
}

.price-value {
  font-family: var(--font-body);
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1;
  color: #0f766e;
}

.meta-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.meta-list p {
  margin: 0;
  color: #334155;
  line-height: 1.4;
}

.meta-label {
  display: inline-block;
  min-width: 3.25rem;
  margin-right: 0.35rem;
  font-family: var(--font-body);
  font-weight: 600;
  color: #475569;
}

.block {
  margin-bottom: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e2e8f0;
}

.block h2 {
  margin: 0 0 0.75rem;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.35;
  color: #0f172a;
}

.note {
  margin: 0;
  font-family: var(--font-body);
  color: #334155;
  font-size: 1rem;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.empty,
.state {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  color: #b91c1c;
}

.error-state p {
  margin: 0;
}

.current-price {
  margin: 0 0 1rem;
}

.price-note {
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: #64748b;
}

.bid-form {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.9rem 1rem;
  border: 1px solid #f0eeeb;
  background: linear-gradient(165deg, #fffefb 0%, #fafaf9 100%);
}

.field-label {
  margin: 0;
  font-family: var(--font-body);
  color: #44403c;
  font-size: 0.9rem;
  font-weight: 600;
}

.bid-hint {
  margin: 0;
  font-family: var(--font-body);
  color: #78716c;
  font-size: 0.8125rem;
}

.bid-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.bid-input {
  flex: 1;
  min-width: 0;
}

.bid-input :deep(.p-inputtext) {
  width: 100%;
}

.submit-btn {
  border: none !important;
  background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%) !important;
  color: #1c1917 !important;
  font-family: var(--font-body) !important;
  font-weight: 600 !important;
}

.form-error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.875rem;
}

.form-success {
  margin: 0;
  color: #15803d;
  font-size: 0.875rem;
}

.login-hint {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.login-hint a {
  color: #0f766e;
  font-weight: 600;
  text-decoration: none;
}

.bid-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.bid-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.75rem 1.25rem;
  align-items: baseline;
  padding: 0.7rem 0;
  border-bottom: 1px solid #f0eeeb;
  font-family: var(--font-body);
}

.bid-item:last-child {
  border-bottom: none;
}

.bid-name {
  color: #334155;
  font-weight: 600;
  min-width: 0;
  word-break: break-word;
}

.bid-amount {
  color: #0f766e;
  font-weight: 700;
}

.bid-time {
  color: #a8a29e;
  font-size: 0.8125rem;
}

.not-found h1 {
  margin: 0 0 0.75rem;
}

.not-found p {
  margin: 0 0 1rem;
  color: #64748b;
}

@media (max-width: 720px) {
  .detail {
    padding: 1rem 1rem 2rem;
  }

  .hero {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .image-wrap {
    height: 220px;
  }

  .bid-item {
    grid-template-columns: 1fr auto;
  }

  .bid-time {
    grid-column: 1 / -1;
  }
}
</style>
