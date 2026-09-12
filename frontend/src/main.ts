import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'

import App from './App.vue'
import { setUnauthorizedHandler } from './api/client'
import router from './router'
import { useAuthStore } from './stores/auth'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
})

const authStore = useAuthStore(pinia)

setUnauthorizedHandler(({ url }) => {
  const hadToken = Boolean(authStore.token)
  authStore.clearSession()

  if (!hadToken) {
    return
  }

  const current = router.currentRoute.value
  if (current.name === 'login' || current.name === 'register') {
    return
  }

  // /auth/me during boot: clear quietly; don't force login on public pages.
  if (url.includes('/auth/me') && !current.meta.requiresAuth) {
    return
  }

  void router.push({
    name: 'login',
    query: { redirect: current.fullPath },
  })
})

void authStore.restoreSession().finally(() => {
  app.mount('#app')
})
