<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="main-layout">
    <header class="site-header">
      <RouterLink class="brand" to="/">WhiskyHello</RouterLink>
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
        <RouterLink to="/login" active-class="is-active">Login</RouterLink>
      </nav>
    </header>
    <div class="page">
      <RouterView />
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
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.25rem;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
}

.brand {
  font-weight: 700;
  font-size: 1.125rem;
  color: #0f172a;
  text-decoration: none;
}

.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
}

.nav a {
  color: #334155;
  text-decoration: none;
  padding: 0.35rem 0.15rem;
}

.nav a.is-active {
  color: #0f766e;
  font-weight: 600;
}

.page {
  min-height: calc(100vh - 3.5rem);
  width: 100%;
  overflow-x: clip;
}

@media (max-width: 640px) {
  .site-header {
    padding: 0.7rem 1rem;
  }

  .brand {
    font-size: 1.05rem;
  }

  .nav {
    gap: 0.25rem 0.9rem;
  }

  .nav a {
    font-size: 0.9375rem;
  }
}
</style>
