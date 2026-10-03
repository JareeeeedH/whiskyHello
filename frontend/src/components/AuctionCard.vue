<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { getWhiskyById } from '../services/whiskyService'
import type { AuctionCardPrice, PublicAuctionDetail } from '../types/auction'

const props = defineProps<{
  auction: PublicAuctionDetail
  price: AuctionCardPrice
}>()

const whisky = computed(() => getWhiskyById(props.auction.whiskyId))

const whiskyName = computed(
  () => whisky.value?.name?.trim() || `酒款 #${props.auction.whiskyId}`,
)

const priceLabel = computed(() =>
  props.price.status === 'starting' ? '起標價' : '目前價格',
)

const priceText = computed(() => {
  if (props.price.status === 'loading') return '—'
  if (props.price.status === 'current') return formatPrice(props.price.value)
  return formatPrice(props.auction.startingPrice)
})

function formatPrice(value: number): string {
  return new Intl.NumberFormat('zh-TW').format(value)
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
</script>

<template>
  <RouterLink
    :to="{ name: 'auction-detail', params: { id: auction.id } }"
    class="auction-card"
  >
    <div class="image-wrap">
      <img
        v-if="whisky?.imageUrl"
        :src="whisky.imageUrl"
        :alt="whiskyName"
        loading="lazy"
      />
      <div v-else class="image-fallback" aria-hidden="true">No image</div>
    </div>
    <div class="body">
      <p class="whisky-name">{{ whiskyName }}</p>
      <h3 class="title">{{ auction.title }}</h3>
      <p class="price-line">
        <span class="price-label">{{ priceLabel }}</span>
        <span class="price-value">{{ priceText }}</span>
      </p>
      <p class="end-line">
        結束
        <time :datetime="auction.endAt">{{ formatAbsoluteTime(auction.endAt) }}</time>
      </p>
      <span class="cta">查看競標 →</span>
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
  border: 1px solid rgba(231, 229, 228, 0.95);
  background: #fff;
  overflow: hidden;
  transition:
    border-color 0.28s ease,
    transform 0.28s ease,
    box-shadow 0.28s ease;
}

.auction-card:hover {
  border-color: rgba(217, 119, 6, 0.45);
  transform: translateY(-3px);
  box-shadow:
    0 0 0 1px rgba(251, 191, 36, 0.12),
    0 14px 28px rgba(28, 25, 23, 0.08);
}

.auction-card:focus-visible {
  outline: 2px solid #b45309;
  outline-offset: 2px;
}

.image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  flex-shrink: 0;
  padding: 0.85rem;
  background:
    radial-gradient(ellipse at 50% 35%, #fff 0%, #f5f5f4 55%, #ebe8e4 100%);
  border-bottom: 1px solid rgba(180, 83, 9, 0.08);
}

.image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.35s ease;
}

.auction-card:hover .image-wrap img {
  transform: scale(1.04);
}

.image-fallback {
  color: #a8a29e;
  font-size: 0.8125rem;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.85rem 0.85rem 0.95rem;
  flex: 1;
}

.whisky-name {
  margin: 0;
  font-family: var(--font-body);
  font-size: 0.75rem;
  line-height: 1.45;
  color: #78716c;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.35;
  color: #1c1917;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.price-line {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin: auto 0 0;
  padding-top: 0.55rem;
}

.price-label {
  font-family: var(--font-body);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #a16207;
}

.price-value {
  font-family: var(--font-body);
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1;
  color: #b45309;
}

.end-line {
  margin: 0;
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: #78716c;
}

.cta {
  margin-top: 0.35rem;
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 600;
  color: #0f766e;
}

@media (max-width: 640px) {
  .image-wrap {
    height: 150px;
    padding: 0.65rem;
  }

  .body {
    padding: 0.7rem;
  }

  .title {
    font-size: 0.9375rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auction-card,
  .image-wrap img {
    transition: none;
  }

  .auction-card:hover {
    transform: none;
  }

  .auction-card:hover .image-wrap img {
    transform: none;
  }
}
</style>
