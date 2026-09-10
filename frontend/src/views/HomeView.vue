<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goExplore() {
  void router.push('/whiskies')
}

const capabilities = [
  {
    title: '探索酒款',
    description: '搜尋威士忌，快速找到你想認識的酒款與評分。',
  },
  {
    title: '分享評論',
    description: '閱讀知名評論家筆記，也留下你自己的品飲感受。',
  },
  {
    title: '發現更多',
    description:
      '未來會有專屬侍酒師，依你的口味與當下心情，輕輕推薦適合的那一杯。',
  },
]
</script>

<template>
  <main class="home">
    <section class="hero">
      <div class="hero-glow" aria-hidden="true" />
      <div class="hero-inner">
        <p class="greeting">威你好</p>
        <h1>找到屬於你的那一杯。</h1>
        <p class="lead">
          在酒香與評論之間，慢慢認識威士忌，也認識自己喜歡的味道。
        </p>
        <button type="button" class="cta" @click="goExplore">
          進入酒款搜尋
        </button>
      </div>
    </section>

    <section class="story section">
      <div class="section-inner narrow">
        <p class="eyebrow">Our story</p>
        <h2>為什麼有 WhiskyHello？</h2>
        <p>
          你可以搜尋酒款、閱讀評論，並留下自己的品飲感受。WhiskyHello
          希望陪你一步步認識威士忌，也在未來越來越了解你的品味與當下心情。
        </p>
      </div>
    </section>

    <section class="capabilities section">
      <div class="section-inner">
        <p class="eyebrow">Features</p>
        <h2>你可以做什麼</h2>
        <div class="capability-grid">
          <article
            v-for="item in capabilities"
            :key="item.title"
            class="capability"
          >
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
          </article>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home {
  color: #1c1917;
}

.hero {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(28, 25, 23, 0.2), rgba(28, 25, 23, 0.55)),
    radial-gradient(ellipse 80% 70% at 20% 0%, rgba(217, 119, 6, 0.28), transparent 55%),
    radial-gradient(ellipse 70% 60% at 90% 30%, rgba(146, 64, 14, 0.22), transparent 50%),
    linear-gradient(160deg, #1c1917 0%, #292524 42%, #1c1917 100%);
  color: #fafaf9;
  padding: 3.25rem 1.5rem 3rem;
}

.hero-glow {
  position: absolute;
  inset: auto -10% -30% auto;
  width: 55%;
  height: 70%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.12), transparent 70%);
  pointer-events: none;
}

.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 36rem;
  margin: 0 auto;
  text-align: center;
}

.greeting {
  margin: 0 0 0.75rem;
  font-size: clamp(1.25rem, 3vw, 1.5rem);
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #fbbf24;
}

.hero h1 {
  margin: 0 0 0.75rem;
  font-size: clamp(1.65rem, 4vw, 2.25rem);
  line-height: 1.25;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.lead {
  margin: 0 auto 1.35rem;
  max-width: 26rem;
  font-size: 0.975rem;
  line-height: 1.7;
  color: #d6d3d1;
}

.cta {
  appearance: none;
  border: 0;
  cursor: pointer;
  padding: 0.7rem 1.35rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 55%, #b45309 100%);
  color: #1c1917;
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow: 0 8px 20px rgba(180, 83, 9, 0.3);
  transition: transform 0.15s ease, filter 0.15s ease;
}

.cta:hover {
  filter: brightness(1.05);
  transform: translateY(-1px);
}

.cta:active {
  transform: translateY(0);
}

.section {
  padding: 4.75rem 1.5rem;
}

.section-inner {
  max-width: 960px;
  margin: 0 auto;
}

.section-inner.narrow {
  max-width: 40rem;
}

.eyebrow {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #a8a29e;
}

.story {
  background: #fafaf9;
}

.story h2,
.capabilities h2 {
  margin: 0 0 1.25rem;
  font-size: clamp(1.5rem, 3vw, 1.875rem);
  letter-spacing: -0.01em;
}

.story p {
  margin: 0;
  font-size: 1.0625rem;
  line-height: 1.85;
  color: #57534e;
}

.capabilities {
  background: #f5f5f4;
}

.capability-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
  margin-top: 0.5rem;
}

.capability {
  padding: 1.75rem 1.35rem;
  background: #fff;
  border: 1px solid #e7e5e4;
}

.capability h3 {
  margin: 0 0 0.65rem;
  font-size: 1.125rem;
  color: #1c1917;
}

.capability p {
  margin: 0;
  color: #57534e;
  line-height: 1.65;
  font-size: 0.975rem;
}

@media (max-width: 800px) {
  .hero {
    padding: 2.75rem 1.25rem 2.5rem;
  }

  .section {
    padding: 3.5rem 1.25rem;
  }

  .capability-grid {
    grid-template-columns: 1fr;
  }
}
</style>
