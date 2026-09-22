<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import { useRouter } from 'vue-router'
import { fetchAdminUsers } from '../services/adminService'
import type { AdminUserListItem } from '../types/admin'
import { resolveUserRole } from '../types/auth'

const router = useRouter()
const users = ref<AdminUserListItem[]>([])
const loading = ref(true)
const errorMessage = ref('')

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 1).toUpperCase()
  }
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase()
}

function formatCreatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

async function loadUsers() {
  loading.value = true
  errorMessage.value = ''
  try {
    users.value = await fetchAdminUsers()
  } catch {
    users.value = []
    errorMessage.value = 'Unable to load users. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadUsers()
})
</script>

<template>
  <main class="admin-users">
    <header class="page-intro">
      <div class="intro-row">
        <div>
          <h1>User Management</h1>
          <p class="page-sub">Read-only list of registered accounts.</p>
        </div>
        <Button
          label="Back"
          severity="secondary"
          text
          @click="router.push('/admin')"
        />
      </div>
    </header>

    <Card class="users-panel" :pt="{ body: { class: 'users-body' } }">
      <template #content>
        <div v-if="loading" class="state" role="status">Loading users…</div>

        <div v-else-if="errorMessage" class="state state-error" role="alert">
          <p>{{ errorMessage }}</p>
          <Button label="Retry" severity="secondary" @click="loadUsers" />
        </div>

        <div v-else-if="users.length === 0" class="state">
          No users found.
        </div>

        <ul v-else class="user-list" aria-label="Users">
          <li v-for="user in users" :key="user.id" class="user-row">
            <div class="avatar-wrap" aria-hidden="true">
              <img
                v-if="user.avatar"
                class="avatar-image"
                :src="user.avatar"
                :alt="''"
              />
              <div v-else class="avatar-fallback">
                {{ initials(user.name) }}
              </div>
            </div>

            <div class="user-meta">
              <div class="user-top">
                <span class="user-name">{{ user.name }}</span>
                <span
                  class="role-badge"
                  :class="resolveUserRole(user.role) === 'admin' ? 'is-admin' : ''"
                >
                  {{ resolveUserRole(user.role) }}
                </span>
              </div>
              <p class="user-email">{{ user.email }}</p>
              <p class="user-joined">
                Joined {{ formatCreatedAt(user.createdAt) }}
              </p>
            </div>
          </li>
        </ul>
      </template>
    </Card>
  </main>
</template>

<style scoped>
.admin-users {
  max-width: 720px;
  margin: 0 auto;
  padding: 2.25rem 1.5rem 3.5rem;
  color: #1c1917;
}

.page-intro {
  margin-bottom: 1.5rem;
}

.intro-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

h1 {
  margin: 0 0 0.35rem;
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: 600;
  letter-spacing: normal;
  line-height: 1.25;
  color: #1c1917;
}

.page-sub {
  margin: 0;
  font-family: var(--font-body);
  color: #a8a29e;
  font-size: 0.95rem;
  line-height: 1.55;
  font-weight: 400;
}

.users-panel {
  border: 1px solid #f0eeeb;
  background: #fff;
  box-shadow: none;
}

:deep(.users-body) {
  padding-top: 0.25rem;
}

.state {
  padding: 1.25rem 0.25rem;
  color: #78716c;
  font-size: 0.95rem;
}

.state-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  color: #b91c1c;
}

.state-error p {
  margin: 0;
}

.user-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.user-row {
  display: flex;
  align-items: flex-start;
  gap: 0.95rem;
  padding: 0.85rem 0.15rem;
  border-bottom: 1px solid #f5f5f4;
}

.user-row:last-child {
  border-bottom: none;
  padding-bottom: 0.25rem;
}

.avatar-wrap {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  overflow: hidden;
  border-radius: 999px;
  border: 2px solid rgba(217, 119, 6, 0.28);
  background: linear-gradient(145deg, #fff7ed 0%, #f5f5f4 100%);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-family: var(--font-body);
  color: #b45309;
  font-size: 0.85rem;
  font-weight: 600;
}

.user-meta {
  min-width: 0;
  flex: 1;
  font-family: var(--font-body);
}

.user-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.65rem;
}

.user-name {
  font-family: var(--font-body);
  font-weight: 600;
  letter-spacing: normal;
  word-break: break-word;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.45rem;
  border: 1px solid #e7e5e4;
  border-radius: 0.35rem;
  color: #78716c;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.role-badge.is-admin {
  border-color: rgba(217, 119, 6, 0.35);
  color: #b45309;
  background: #fffbeb;
}

.user-email,
.user-joined {
  margin: 0.2rem 0 0;
  color: #a8a29e;
  font-size: 0.88rem;
  line-height: 1.4;
  word-break: break-word;
}

.user-joined {
  font-size: 0.82rem;
}

@media (max-width: 480px) {
  .intro-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
