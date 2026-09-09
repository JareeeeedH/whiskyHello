<script setup lang="ts">
import Button from 'primevue/button'
import { useAppStore } from '../stores/app'
import { apiClient } from '../api/client'

const appStore = useAppStore()

function handleCheck() {
  appStore.markReady()
}

function handleApiSmoke() {
  // Confirms Axios client is wired; backend may not exist yet.
  void apiClient.get('/health').catch(() => {
    // Expected until backend is available.
  })
}
</script>

<template>
  <main class="home">
    <h1>WhiskyHello</h1>
    <p>Frontend skeleton is running.</p>
    <p class="status">Status: {{ appStore.status }}</p>
    <div class="actions">
      <Button label="Check Pinia" icon="pi pi-check" @click="handleCheck" />
      <Button
        label="Smoke Axios"
        icon="pi pi-send"
        severity="secondary"
        outlined
        @click="handleApiSmoke"
      />
    </div>
  </main>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 100vh;
  padding: 2rem;
  text-align: center;
}

.status {
  color: var(--p-primary-color, #0f766e);
  font-weight: 600;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 0.5rem;
}
</style>
