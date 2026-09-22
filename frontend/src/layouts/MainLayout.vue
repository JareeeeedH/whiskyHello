<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const brandLogoSrc = `${import.meta.env.BASE_URL}favicon.svg`
const isMobileNavOpen = ref(false)

function closeMobileNav() {
  isMobileNavOpen.value = false
}

function toggleMobileNav() {
  isMobileNavOpen.value = !isMobileNavOpen.value
}

function onDrawerKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMobileNav()
  }
}

watch(
  () => route.fullPath,
  () => {
    closeMobileNav()
  },
)

watch(isMobileNavOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) {
    window.addEventListener('keydown', onDrawerKeydown)
  } else {
    window.removeEventListener('keydown', onDrawerKeydown)
  }
})

function onViewportChange() {
  if (window.matchMedia('(min-width: 641px)').matches) {
    closeMobileNav()
  }
}

window.addEventListener('resize', onViewportChange)

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onDrawerKeydown)
  window.removeEventListener('resize', onViewportChange)
})

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
  closeMobileNav()
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

    <header class="site-header" :class="{ 'is-drawer-open': isMobileNavOpen }">
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

      <nav class="nav nav--desktop" aria-label="Primary">
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

      <button
        type="button"
        class="nav-toggle"
        :aria-expanded="isMobileNavOpen"
        aria-controls="mobile-nav"
        :aria-label="isMobileNavOpen ? '關閉選單' : '開啟選單'"
        @click="toggleMobileNav"
      >
        <span class="nav-toggle-icon" :class="{ 'is-open': isMobileNavOpen }" aria-hidden="true" />
      </button>
      </div>
    </header>

    <Teleport to="body">
      <div
        class="nav-drawer"
        :class="{ 'is-open': isMobileNavOpen }"
        :aria-hidden="!isMobileNavOpen"
      >
        <button
          type="button"
          class="nav-drawer-backdrop"
          tabindex="-1"
          aria-label="關閉選單"
          @click="closeMobileNav"
        />
        <nav
          id="mobile-nav"
          class="nav-drawer-panel"
          aria-label="Mobile"
        >
          <p class="nav-drawer-label">Menu</p>
          <RouterLink
            v-slot="{ href, navigate, isExactActive }"
            to="/"
            custom
          >
            <a
              :href="href"
              class="nav-mobile-link"
              :class="{ 'is-active': isExactActive }"
              :tabindex="isMobileNavOpen ? undefined : -1"
              @click="(e) => { closeMobileNav(); navigate(e) }"
            >Home</a>
          </RouterLink>
          <RouterLink
            to="/whiskies"
            class="nav-mobile-link"
            active-class="is-active"
            :tabindex="isMobileNavOpen ? undefined : -1"
            @click="closeMobileNav"
          >
            Whisky
          </RouterLink>

          <template v-if="authStore.isAuthenticated">
            <RouterLink
              v-if="authStore.isAdmin"
              to="/admin"
              class="nav-mobile-link"
              active-class="is-active"
              :tabindex="isMobileNavOpen ? undefined : -1"
              @click="closeMobileNav"
            >
              Admin
            </RouterLink>
            <RouterLink
              to="/profile"
              class="nav-mobile-link"
              active-class="is-active"
              :tabindex="isMobileNavOpen ? undefined : -1"
              @click="closeMobileNav"
            >
              Profile
            </RouterLink>
            <button
              type="button"
              class="nav-mobile-link nav-mobile-logout"
              :tabindex="isMobileNavOpen ? undefined : -1"
              @click="onLogout"
            >
              Logout
            </button>
          </template>
          <RouterLink
            v-else
            to="/login"
            class="nav-mobile-link"
            active-class="is-active"
            :tabindex="isMobileNavOpen ? undefined : -1"
            @click="closeMobileNav"
          >
            Login
          </RouterLink>
        </nav>
      </div>
    </Teleport>

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
  font-family: var(--font-body);
  font-weight: 600;
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
  font-family: var(--font-body);
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 1rem;
  font-family: var(--font-body);
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

/* Hidden on desktop; shown only in the mobile breakpoint. */
.nav-toggle {
  display: none;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin: -0.35rem -0.35rem -0.35rem 0;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 0.35rem;
  background: transparent;
  color: #1c1917;
  cursor: pointer;
}

.nav-toggle:hover {
  border-color: #e7e5e4;
  background: #fafaf9;
}

.nav-toggle:focus-visible {
  outline: 2px solid #b45309;
  outline-offset: 2px;
}

.nav-toggle-icon {
  position: relative;
  display: block;
  width: 1.15rem;
  height: 0.1rem;
  background: currentColor;
  border-radius: 1px;
  transition: background 160ms ease;
}

.nav-toggle-icon::before,
.nav-toggle-icon::after {
  content: '';
  position: absolute;
  left: 0;
  width: 100%;
  height: 0.1rem;
  background: currentColor;
  border-radius: 1px;
  transition: transform 160ms ease;
}

.nav-toggle-icon::before {
  top: -0.35rem;
}

.nav-toggle-icon::after {
  top: 0.35rem;
}

.nav-toggle-icon.is-open {
  background: transparent;
}

.nav-toggle-icon.is-open::before {
  top: 0;
  transform: rotate(45deg);
}

.nav-toggle-icon.is-open::after {
  top: 0;
  transform: rotate(-45deg);
}

/*
 * Mobile drawer roots are teleported to body.
 * Hidden / inert on desktop; animated via transform on mobile.
 */
.nav-drawer {
  display: none;
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
  .site-header {
    position: relative;
    z-index: 130;
  }

  .site-header.is-drawer-open {
    border-bottom-color: transparent;
  }

  .site-header-inner {
    flex-wrap: nowrap;
    padding: 0.55rem 0.85rem 0.55rem 1rem;
  }

  .brand {
    font-size: 1.05rem;
  }

  .nav--desktop {
    display: none;
  }

  .nav-toggle {
    display: inline-flex;
    position: relative;
    z-index: 131;
  }

  .nav-drawer {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 120;
    pointer-events: none;
  }

  .nav-drawer.is-open {
    pointer-events: auto;
  }

  .nav-drawer-backdrop {
    position: absolute;
    inset: 0;
    margin: 0;
    padding: 0;
    border: none;
    background: rgba(28, 25, 23, 0.38);
    opacity: 0;
    cursor: pointer;
    transition: opacity 220ms ease;
  }

  .nav-drawer.is-open .nav-drawer-backdrop {
    opacity: 1;
  }

  .nav-drawer-panel {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    width: min(17.5rem, 82vw);
    height: 100%;
    max-height: 100dvh;
    padding: 4.25rem 0 1.25rem;
    border-left: 1px solid #e7e5e4;
    background: #fafaf9;
    box-shadow: -12px 0 32px rgba(28, 25, 23, 0.12);
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    transform: translate3d(104%, 0, 0);
    transition: transform 320ms cubic-bezier(0.22, 1.18, 0.36, 1);
    will-change: transform;
  }

  .nav-drawer.is-open .nav-drawer-panel {
    transform: translate3d(0, 0, 0);
  }

  .nav-drawer-label {
    margin: 0 1.15rem 0.65rem;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #a8a29e;
  }

  .nav-mobile-link {
    display: block;
    width: 100%;
    margin: 0;
    padding: 0.95rem 1.15rem;
    border: none;
    border-bottom: 1px solid #e7e5e4;
    background: transparent;
    color: #1c1917;
    font: inherit;
    font-size: 0.98rem;
    letter-spacing: 0.01em;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }

  .nav-mobile-link:last-child {
    border-bottom: none;
  }

  .nav-mobile-link:hover,
  .nav-mobile-link:focus-visible {
    color: #b45309;
    background: rgba(180, 83, 9, 0.04);
  }

  .nav-mobile-link.is-active {
    color: #b45309;
    font-weight: 600;
  }

  .nav-mobile-logout:hover,
  .nav-mobile-logout:focus-visible {
    color: #b45309;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-toggle-icon,
  .nav-toggle-icon::before,
  .nav-toggle-icon::after,
  .nav-drawer-backdrop,
  .nav-drawer-panel {
    transition: none !important;
  }
}
</style>
