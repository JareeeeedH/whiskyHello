<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import { useRouter } from 'vue-router'

const router = useRouter()

function goUsers() {
  void router.push('/admin/users')
}
</script>

<template>
  <main class="admin">
    <header class="page-intro">
      <h1>Admin</h1>
      <p class="page-sub">Manage WhiskyHello administration tools.</p>
    </header>

    <div class="feature-grid">
      <Card class="feature-card" :pt="{ body: { class: 'feature-body' } }">
        <template #title>User Management</template>
        <template #subtitle>View registered accounts</template>
        <template #content>
          <p class="feature-copy">
            Browse users by name, email, role, and join date.
          </p>
        </template>
        <template #footer>
          <Button
            label="Open"
            severity="secondary"
            @click="goUsers"
          />
        </template>
      </Card>

      <Card
        class="feature-card is-disabled"
        :pt="{ body: { class: 'feature-body' } }"
      >
        <template #title>Coming Soon</template>
        <template #subtitle>Not available yet</template>
        <template #content>
          <p class="feature-copy">
            Additional admin tools will appear here in a later phase.
          </p>
        </template>
        <template #footer>
          <Button label="Coming Soon" disabled />
        </template>
      </Card>
    </div>
  </main>
</template>

<style scoped>
.admin {
  max-width: 720px;
  margin: 0 auto;
  padding: 2.25rem 1.5rem 3.5rem;
  color: #1c1917;
}

.page-intro {
  margin-bottom: 1.5rem;
}

h1 {
  margin: 0 0 0.35rem;
  font-size: clamp(1.65rem, 3.5vw, 2rem);
  letter-spacing: -0.03em;
  color: #1c1917;
}

.page-sub {
  margin: 0;
  color: #a8a29e;
  font-size: 0.95rem;
  line-height: 1.5;
}

.feature-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .feature-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.feature-card {
  border: 1px solid #f0eeeb;
  background: #fff;
  box-shadow: none;
}

.feature-card.is-disabled {
  opacity: 0.72;
}

.feature-copy {
  margin: 0;
  color: #78716c;
  font-size: 0.92rem;
  line-height: 1.55;
}

:deep(.feature-body) {
  padding-top: 0.35rem;
}
</style>
