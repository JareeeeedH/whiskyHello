<script setup lang="ts">
import Button from 'primevue/button'
import { useRouter } from 'vue-router'

const router = useRouter()

function goSearch() {
  void router.push('/whiskies')
}
</script>

<template>
  <main class="home">
    <h1>WhiskyHello</h1>
    <p>
      威士忌探索、評論與未來 AI 個人化體驗平台。先從搜尋威士忌與知名評論開始。
    </p>
    <Button label="搜尋威士忌" icon="pi pi-search" @click="goSearch" />
  </main>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 60vh;
  padding: 2rem;
  text-align: center;
}

h1,
p {
  margin: 0;
  max-width: 36rem;
}

p {
  color: #475569;
  line-height: 1.6;
}
</style>
