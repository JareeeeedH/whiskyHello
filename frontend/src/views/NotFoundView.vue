<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="not-found">
    <h1>找不到這個頁面</h1>
    <p>這個網址可能已經移除或輸入有誤，回到首頁或探索酒款繼續找下一杯威士忌。</p>
    <p class="links">
      <RouterLink to="/">← 回到首頁</RouterLink>
      <RouterLink to="/whiskies">探索威士忌</RouterLink>
    </p>
  </main>
</template>

<style scoped>
.not-found {
  max-width: 880px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 3rem;
}

h1 {
  margin: 0 0 0.75rem;
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 3vw, 1.75rem);
  font-weight: 600;
  color: #0f172a;
}

p {
  margin: 0 0 1rem;
  color: #64748b;
  line-height: 1.6;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
}

.links a {
  color: #0f766e;
  text-decoration: none;
}

@media (max-width: 720px) {
  .not-found {
    padding: 1.5rem 1rem 2rem;
  }
}
</style>
