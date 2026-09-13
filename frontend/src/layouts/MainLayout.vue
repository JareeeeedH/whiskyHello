<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()
const brandLogoSrc = `${import.meta.env.BASE_URL}favicon.svg`

/**
 * Route chunk loading (e.g. first visit to Home pulls a large async view).
 * Starts true so the first paint never shows an empty content area.
 * Subsequent navigations only show the skeleton if resolution takes >120ms
 * (avoids flicker on already-cached chunks).
 */
const isRouteLoading = ref(true)
let loadingDelayTimer: ReturnType<typeof setTimeout> | undefined

function clearLoadingDelay() {
  if (loadingDelayTimer !== undefined) {
    window.clearTimeout(loadingDelayTimer)
    loadingDelayTimer = undefined
  }
}

void router.isReady().then(() => {
  isRouteLoading.value = false
})

router.beforeEach((_to, from) => {
  // Initial navigation is covered by isReady(); avoid double-handling.
  if (from.matched.length === 0) {
    return true
  }

  clearLoadingDelay()
  loadingDelayTimer = window.setTimeout(() => {
    isRouteLoading.value = true
  }, 120)

  return true
})

router.afterEach(() => {
  clearLoadingDelay()
  isRouteLoading.value = false
})

router.onError(() => {
  clearLoadingDelay()
  isRouteLoading.value = false
})

function onLogout() {
  authStore.logout()
  toast.add({
    severity: 'success',
    summary: '已成功登出',
    life: 1800,
  })
  void router.push('/')
}
</script>

<template>
  <div class="main-layout">
    <Toast position="top-center" :pt="{ root: { class: 'wh-toast' } }" />

    <header class="site-header">
      <div class="site-header-inner">
      <RouterLink class="brand" to="/" aria-label="WhiskyHello 首頁">
        <img
          class="brand-mark"
          :src="brandLogoSrc"
          alt=""
          width="32"
          height="32"
          decoding="async"
        />
        <span class="brand-wordmark">WhiskyHello</span>
      </RouterLink>
      <nav class="nav">
        <RouterLink
          v-slot="{ href, navigate, isExactActive }"
          to="/"
          custom
        >
          <a
            :href="href"
            :class="{ 'is-active': isExactActive }"
            @click="navigate"
          >Home</a>
        </RouterLink>
        <RouterLink to="/whiskies" active-class="is-active">Whisky</RouterLink>

        <template v-if="authStore.isAuthenticated">
          <RouterLink
            v-if="authStore.isAdmin"
            to="/admin"
            active-class="is-active"
          >
            Admin
          </RouterLink>
          <RouterLink to="/profile" active-class="is-active">Profile</RouterLink>
          <button type="button" class="nav-logout" @click="onLogout">
            Logout
          </button>
        </template>
        <RouterLink
          v-else
          to="/login"
          active-class="is-active"
        >
          Login
        </RouterLink>
      </nav>
      </div>
    </header>

    <div class="page">
      <!--
        Loading covers RouterView async chunk resolution.
        Suspense cannot show a fallback here: Vue Router resolves lazy
        components before passing Component into the slot, so Suspense
        often receives nothing pending (blank content instead).
      -->
      <div
        v-if="isRouteLoading"
        class="route-loading"
        role="status"
        aria-live="polite"
      >
        <div class="route-loading-skel" aria-hidden="true">
          <span class="skel-line skel-wide" />
          <span class="skel-line skel-mid" />
          <span class="skel-line skel-narrow" />
        </div>
        <p class="route-loading-text">載入中…</p>
      </div>

      <RouterView v-slot="{ Component, route }">
        <Transition name="route-fade" mode="out-in">
          <div
            v-if="Component && !isRouteLoading"
            :key="route.fullPath"
            class="route-shell"
          >
            <component :is="Component" />
          </div>
        </Transition>
      </RouterView>
    </div>
  </div>
</template>

<style scoped>
.main-layout {
  min-height: 100vh;
  width: 100%;
  overflow-x: clip;
}

.site-header {
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
}

.site-header-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.25rem;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-weight: 700;
  font-size: 1.125rem;
  color: #0f172a;
  text-decoration: none;
  min-width: 0;
}

.brand-mark {
  flex-shrink: 0;
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 0.45rem;
  box-shadow: 0 0 0 1px rgba(180, 83, 9, 0.22);
}

.brand-wordmark {
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 1rem;
}

.nav a,
.nav-logout {
  color: #334155;
  text-decoration: none;
  padding: 0.35rem 0.15rem;
  font: inherit;
  background: none;
  border: none;
  cursor: pointer;
}

.nav a.is-active {
  color: #0f766e;
  font-weight: 600;
}

.nav-logout:hover {
  color: #b45309;
}

.nav-logout:focus-visible {
  outline: 2px solid #b45309;
  outline-offset: 2px;
  border-radius: 2px;
}

.page {
  position: relative;
  min-height: calc(100vh - 3.5rem);
  width: 100%;
  overflow-x: clip;
  background: #f8fafc;
}

.route-shell {
  min-height: calc(100vh - 3.5rem);
  width: 100%;
}

.route-fade-enter-active,
.route-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.route-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.route-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.route-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: calc(100vh - 3.5rem);
  padding: 2rem 1.25rem;
  background: #f8fafc;
  color: #64748b;
}

.route-loading-skel {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  width: min(22rem, 100%);
}

.skel-line {
  display: block;
  height: 0.7rem;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    #e2e8f0 0%,
    #f1f5f9 50%,
    #e2e8f0 100%
  );
  background-size: 200% 100%;
  animation: skel-shimmer 1.1s ease-in-out infinite;
}

.skel-wide {
  width: 100%;
}

.skel-mid {
  width: 72%;
}

.skel-narrow {
  width: 44%;
}

.route-loading-text {
  margin: 0;
  font-size: 0.875rem;
  letter-spacing: 0.02em;
}

@keyframes skel-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

@media (max-width: 640px) {
  .site-header-inner {
    padding: 0.7rem 1rem;
  }

  .brand {
    font-size: 1.05rem;
  }

  .nav {
    gap: 0.25rem 0.9rem;
  }

  .nav a,
  .nav-logout {
    font-size: 0.9375rem;
  }
}
</style>
