import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const status = ref('idle')

  function markReady() {
    status.value = 'ready'
  }

  return {
    status,
    markReady,
  }
})
