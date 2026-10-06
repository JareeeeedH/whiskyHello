<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { getWhiskyById } from '../services/whiskyService'
import type { AuctionCardPrice, PublicAuctionDetail } from '../types/auction'
import {
  formatCompactCountdown,
  formatLotNumber,
  formatPrice,
  formatScheduleTime,
  getCountdownParts,
  isEndingSoon,
} from '../utils/auctionDisplay'

const props = defineProps<{
  auction: PublicAuctionDetail
  price: AuctionCardPrice
}>()

const whisky = computed(() => getWhiskyById(props.auction.whiskyId))

const whiskyName = computed(
  () => whisky.value?.name?.trim() || `酒款 #${props.auction.whiskyId}`,
)

const imageFailed = ref(false)
watch(() => whisky.value?.imageUrl, () => { imageFailed.value = false })

const isActive = computed(() => props.auction.status === 'active')
const isEnded = computed(() => props.auction.status === 'ended')

const statusClass = computed(() => {
  if (isActive.value) return 'is-live'
  return isEnded.value ? 'is-ended' : 'is-upcoming'
})

const statusEn = computed(() => {
  if (isActive.value) return 'LIVE'
  return isEnded.value ? 'ENDED' : 'UPCOMING'
})

const statusZh = computed(() => {
  if (isActive.value) return '競標中'
  return isEnded.value ? '已結束' : '即將開始'
})

const endedHasBids = computed(
  () => props.price.status === 'current' && props.price.bidCount > 0,
)

const priceLabel = computed(() => {
  if (isEnded.value) {
    if (props.price.status === 'loading') return '結標結果'
    if (props.price.status === 'current') return endedHasBids.value ? '有成交' : '未達底價'
    return '起標價'
  }
  if (props.price.status === 'current' && props.price.bidCount > 0) return '目前出價'
  if (props.price.status === 'loading') return '目前出價'
  return '起標價'
})

const priceText = computed(() => {
  if (props.price.status === 'loading') return '—'
  if (isEnded.value && !endedHasBids.value) return formatPrice(props.auction.startingPrice)
  if (props.price.status === 'current') return formatPrice(props.price.value)
  return formatPrice(props.auction.startingPrice)
})

const bidCountText = computed(() => {
  if (props.price.status === 'loading') return '—'
  if (props.price.status === 'current') {
    return props.price.bidCount > 0 ? `${props.price.bidCount} 次出價` : '尚無出價'
  }
  return ''
})

const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined

const countdownParts = computed(() =>
  getCountdownParts(
    new Date(isActive.value ? props.auction.endAt : props.auction.startAt).getTime(),
    now.value,
  ),
)

const countdownText = computed(() => {
  if (countdownParts.value.totalSeconds === 0) {
    return isActive.value ? '結標中' : '即將開始'
  }
  return formatCompactCountdown(countdownParts.value)
})

const endingSoon = computed(() => isActive.value && isEndingSoon(countdownParts.value))

onMounted(() => { clock = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => { if (clock) clearInterval(clock) })
</script>

<template>
  <RouterLink
    :to="{ name: 'auction-detail', params: { id: auction.id } }"
    class="auction-card"
    :class="statusClass"
  >
    <div class="media">
      <span class="status-pill">
        <span class="status-dot" aria-hidden="true" />
        <span class="status-en">{{ statusEn }}</span>
        <span class="status-zh">{{ statusZh }}</span>
      </span>
      <img
        v-if="whisky?.imageUrl && !imageFailed"
        :src="whisky.imageUrl"
        :alt="whiskyName"
        loading="lazy"
        @error="imageFailed = true"
      />
      <div v-else class="image-fallback" aria-hidden="true">No image</div>
    </div>

    <div class="body">
      <p class="lot">LOT {{ formatLotNumber(auction.id) }}</p>
      <h3 class="title">{{ auction.title }}</h3>
      <p class="whisky">{{ whiskyName }}</p>

      <dl class="ledger">
        <div class="ledger-price">
          <dt>{{ priceLabel }}</dt>
          <dd><span class="currency">NT$</span>{{ priceText }}</dd>
        </div>
        <div v-if="isActive && bidCountText" class="ledger-bids">
          <dt class="sr-only">出價次數</dt>
          <dd>{{ bidCountText }}</dd>
        </div>
      </dl>

      <p v-if="isEnded" class="time-row">
        <span>結標時間</span>
        <strong><time :datetime="auction.endAt">{{ formatScheduleTime(auction.endAt) }}</time></strong>
      </p>
      <p v-else class="time-row" :class="{ 'is-soon': endingSoon }">
        <span>{{ isActive ? '剩餘時間' : '開標倒數' }}</span>
        <strong>{{ countdownText }}</strong>
      </p>
      <p v-if="!isActive && !isEnded" class="schedule">
        開標 <time :datetime="auction.startAt">{{ formatScheduleTime(auction.startAt) }}</time>
      </p>
    </div>
  </RouterLink>
</template>

<style scoped>
.auction-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: inherit;
  text-decoration: none;
  border: 1px solid #e7e1d8;
  background: #fff;
  overflow: hidden;
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

.auction-card:hover {
  border-color: #c9a46a;
  box-shadow: 0 14px 28px -22px rgba(28, 25, 23, 0.35);
}

.auction-card:focus-visible {
  outline: 2px solid #b45309;
  outline-offset: 3px;
}

.media {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1.08;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 42%, #fffdf9 0%, #f3ede3 62%, #e9e1d4 100%);
  border-bottom: 1px solid #ece5da;
}

.media img {
  position: absolute;
  top: 2.6rem;
  left: 1.25rem;
  width: calc(100% - 2.5rem);
  height: calc(100% - 3.85rem);
  object-fit: contain;
  filter: drop-shadow(0 14px 14px rgba(41, 37, 36, 0.16));
  transition: transform 0.5s ease;
}

.auction-card:hover .media img {
  transform: scale(1.035);
}

.image-fallback {
  color: #a8a29e;
  font-size: 0.8125rem;
}

.status-pill {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.22rem 0.6rem 0.22rem 0.5rem;
  font-size: 0.66rem;
  font-weight: 600;
  line-height: 1.4;
}

.status-en {
  letter-spacing: 0.16em;
}

.status-zh {
  padding-left: 0.4rem;
  border-left: 1px solid currentColor;
  font-weight: 500;
  opacity: 0.8;
}

.status-dot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.is-live .status-pill {
  color: #f5e6c8;
  background: rgba(17, 14, 12, 0.88);
}

.is-live .status-dot {
  background: #e0a84a;
  animation: live-pulse 2s ease-out infinite;
}

.is-upcoming .status-pill {
  color: #57534e;
  border: 1px solid #d8cfc2;
  background: rgba(255, 253, 249, 0.92);
}

.is-upcoming .status-dot {
  border: 1px solid #a8a29e;
}

.lot {
  margin: 0 0 0.3rem;
  color: #a8a29e;
  font-size: 0.64rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  font-variant-numeric: tabular-nums;
}

.is-upcoming .media {
  background: radial-gradient(ellipse at 50% 42%, #fbfaf8 0%, #efece7 62%, #e4e0da 100%);
}

.is-upcoming .media img {
  filter: saturate(0.82) drop-shadow(0 14px 14px rgba(41, 37, 36, 0.12));
}

.is-ended .status-pill {
  color: #78716c;
  border: 1px solid #d6d3d1;
  background: rgba(250, 250, 249, 0.92);
}

.is-ended .status-dot {
  background: #a8a29e;
}

.is-ended .media {
  background: radial-gradient(ellipse at 50% 42%, #fafaf9 0%, #eeedeb 62%, #e2e0dd 100%);
}

.is-ended .media img {
  filter: grayscale(0.4) drop-shadow(0 14px 14px rgba(41, 37, 36, 0.1));
}

.body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 1rem 1.05rem 1.05rem;
}

.title {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #1c1917;
  font-family: var(--font-display);
  font-size: 1.04rem;
  font-weight: 600;
  line-height: 1.4;
  transition: color 0.3s ease;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.auction-card:hover .title {
  color: #7c3f16;
}

.whisky {
  display: -webkit-box;
  margin: 0.3rem 0 0;
  overflow: hidden;
  color: #8a7f73;
  font-size: 0.75rem;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
}

.ledger {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  margin: auto 0 0;
  padding-top: 1rem;
}

.ledger dt {
  margin-bottom: 0.15rem;
  color: #a8a29e;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.ledger dd {
  margin: 0;
}

.ledger-price dd {
  color: #1c1917;
  font-family: var(--font-body);
  font-size: 1.375rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.is-live .ledger-price dd {
  color: #6f2f12;
}

.currency {
  margin-right: 0.25rem;
  color: #a16207;
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.ledger-bids dd {
  padding-bottom: 0.2rem;
  color: #78716c;
  font-size: 0.74rem;
  white-space: nowrap;
}

.time-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin: 0.75rem 0 0;
  padding-top: 0.65rem;
  border-top: 1px solid #efe9df;
  color: #8a7f73;
  font-size: 0.72rem;
}

.time-row strong {
  color: #44403c;
  font-size: 0.86rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.time-row.is-soon strong {
  color: #9a3412;
}

.schedule {
  margin: 0.3rem 0 0;
  color: #8a7f73;
  font-size: 0.72rem;
  text-align: right;
}

.schedule time {
  color: #57534e;
  font-variant-numeric: tabular-nums;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@keyframes live-pulse {
  0% { box-shadow: 0 0 0 0 rgba(224, 168, 74, 0.55); }
  100% { box-shadow: 0 0 0 6px rgba(224, 168, 74, 0); }
}

@media (max-width: 479px) {
  .auction-card {
    flex-direction: row;
  }

  .media {
    flex: 0 0 38%;
    aspect-ratio: auto;
    min-height: 11.5rem;
    border-right: 1px solid #ece5da;
    border-bottom: 0;
  }

  .media img {
    top: 2.3rem;
    left: 0.6rem;
    width: calc(100% - 1.2rem);
    height: calc(100% - 3rem);
  }

  .status-pill {
    top: 0.55rem;
    left: 0.55rem;
  }

  .status-zh {
    display: none;
  }

  .body {
    min-width: 0;
    padding: 0.85rem 0.9rem;
  }

  .title {
    font-size: 0.98rem;
  }

  .ledger-price dd {
    font-size: 1.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auction-card,
  .media img,
  .title {
    transition: none;
  }

  .auction-card:hover .media img {
    transform: none;
  }

  .is-live .status-dot {
    animation: none;
  }
}
</style>
