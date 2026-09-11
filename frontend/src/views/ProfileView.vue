<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const profile = computed(() => authStore.user)

const isEditing = ref(false)
const draftName = ref('')
const draftAvatar = ref('')
const draftBio = ref('')
const editNotice = ref('')

const displayName = computed(() => {
  if (isEditing.value) return draftName.value.trim() || profile.value?.name || ''
  return profile.value?.name?.trim() || ''
})

const displayEmail = computed(() => profile.value?.email?.trim() || '')

const displayBio = computed(() => {
  if (isEditing.value) return draftBio.value
  return profile.value?.bio?.trim() || ''
})

const avatarUrl = computed(() => {
  if (isEditing.value) return draftAvatar.value.trim()
  return profile.value?.avatar?.trim() || ''
})

const hasAvatar = computed(() => Boolean(avatarUrl.value))

const initials = computed(() => {
  const name = displayName.value
  if (!name) return '?'
  return name.slice(0, 1).toUpperCase()
})

watch(
  profile,
  (user) => {
    if (!user || isEditing.value) return
    draftName.value = user.name ?? ''
    draftAvatar.value = user.avatar ?? ''
    draftBio.value = user.bio ?? ''
  },
  { immediate: true },
)

function startEdit() {
  if (!profile.value) return
  draftName.value = profile.value.name ?? ''
  draftAvatar.value = profile.value.avatar ?? ''
  draftBio.value = profile.value.bio ?? ''
  editNotice.value = ''
  isEditing.value = true
}

function cancelEdit() {
  if (!profile.value) return
  draftName.value = profile.value.name ?? ''
  draftAvatar.value = profile.value.avatar ?? ''
  draftBio.value = profile.value.bio ?? ''
  editNotice.value = ''
  isEditing.value = false
}

function saveEdit() {
  // UI only — profile update API will be wired later.
  editNotice.value = '個人資料編輯介面已就緒，儲存功能即將開放。'
  isEditing.value = false
}
</script>

<template>
  <main class="profile">
    <header class="page-intro">
      <h1>我的 WhiskyHello</h1>
    </header>

    <template v-if="profile">
      <section class="profile-panel" aria-labelledby="profile-heading">
        <div class="profile-header">
          <div class="avatar-wrap" aria-hidden="true">
            <img
              v-if="hasAvatar"
              :src="avatarUrl"
              :alt="`${displayName} 的頭像`"
              class="avatar-image"
            />
            <div v-else class="avatar-fallback">{{ initials }}</div>
          </div>

          <div class="identity">
            <h2 id="profile-heading" class="display-name">
              {{ displayName || '尚未設定名稱' }}
            </h2>
            <p class="display-email">{{ displayEmail || '—' }}</p>
            <Button
              v-if="!isEditing"
              type="button"
              label="編輯個人資料"
              icon="pi pi-pencil"
              class="edit-btn"
              @click="startEdit"
            />
          </div>
        </div>

        <div v-if="!isEditing" class="profile-body">
          <div class="field-block">
            <p class="label">名稱</p>
            <p class="value">{{ displayName || '—' }}</p>
          </div>
          <div class="field-block">
            <p class="label">Email</p>
            <p class="value">{{ displayEmail || '—' }}</p>
          </div>
          <div class="field-block">
            <p class="label">個人簡介</p>
            <p class="value bio">
              {{ displayBio || '還沒有寫簡介，之後可以分享你與威士忌的故事。' }}
            </p>
          </div>
        </div>

        <form v-else class="edit-form" @submit.prevent="saveEdit">
          <label class="edit-field">
            <span class="label">名稱</span>
            <InputText
              v-model="draftName"
              class="field"
              autocomplete="name"
              placeholder="你的顯示名稱"
            />
          </label>

          <label class="edit-field">
            <span class="label">Email</span>
            <InputText
              :model-value="displayEmail"
              class="field"
              type="email"
              disabled
              readonly
            />
          </label>
          <label class="edit-field">
            <span class="label">個人簡介</span>
            <Textarea
              v-model="draftBio"
              class="field"
              rows="4"
              auto-resize
              placeholder="聊聊你喜歡的威士忌、品飲習慣或最近的發現…"
            />
          </label>

          <div class="edit-actions">
            <Button
              type="submit"
              label="儲存"
              icon="pi pi-check"
              class="save-btn"
            />
            <Button
              type="button"
              label="取消"
              severity="secondary"
              text
              class="cancel-btn"
              @click="cancelEdit"
            />
          </div>
        </form>

        <p v-if="editNotice" class="edit-notice" role="status">
          {{ editNotice }}
        </p>
      </section>

      <section class="reviews-panel" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" class="section-title">我的評論</h2>
        <p class="section-desc">你留下的品飲筆記，會慢慢累積成專屬的威士忌足跡。</p>
        <RouterLink class="reviews-link" to="/profile">
          查看我留下的威士忌評論 →
        </RouterLink>
        <p class="coming-soon">評論列表即將開放。</p>
      </section>
    </template>
  </main>
</template>

<style scoped>
.profile {
  max-width: 640px;
  margin: 0 auto;
  padding: 2.25rem 1.5rem 3.5rem;
  color: #1c1917;
}

.page-intro {
  margin-bottom: 1.75rem;
}

h1 {
  margin: 0 0 0.45rem;
  font-size: clamp(1.65rem, 3.5vw, 2rem);
  letter-spacing: -0.03em;
  color: #1c1917;
}

.subtitle {
  margin: 0;
  max-width: 28rem;
  color: #78716c;
  line-height: 1.6;
  font-size: 1rem;
}

.profile-panel,
.reviews-panel,
.account-panel {
  padding: 1.5rem 1.4rem;
  border: 1px solid #e7e5e4;
  background:
    linear-gradient(165deg, #fffefb 0%, #fff 55%, #fafaf9 100%);
  box-shadow: 0 10px 28px rgba(28, 25, 23, 0.04);
}

.profile-panel {
  margin-bottom: 1rem;
}

.reviews-panel,
.account-panel {
  margin-bottom: 1rem;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding-bottom: 1.35rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid #f0eeeb;
}

.avatar-wrap {
  flex-shrink: 0;
  width: 6.5rem;
  height: 6.5rem;
  overflow: hidden;
  border-radius: 999px;
  border: 2px solid rgba(217, 119, 6, 0.28);
  background: linear-gradient(145deg, #fff7ed 0%, #f5f5f4 100%);
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.12);
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
  color: #b45309;
  font-size: 2rem;
  font-weight: 700;
}

.identity {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: flex-start;
}

.display-name {
  margin: 0;
  font-size: clamp(1.25rem, 2.5vw, 1.45rem);
  letter-spacing: -0.02em;
  color: #1c1917;
  word-break: break-word;
}

.display-email {
  margin: 0;
  color: #78716c;
  font-size: 0.95rem;
  word-break: break-word;
}

.edit-btn {
  margin-top: 0.45rem;
  border: none !important;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%) !important;
  color: #1c1917 !important;
  font-weight: 700 !important;
  box-shadow: 0 8px 18px rgba(217, 119, 6, 0.22) !important;
}

.profile-body {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.field-block .label,
.edit-field .label,
.section-title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #a8a29e;
}

.section-title {
  margin-bottom: 0.4rem;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  color: #57534e;
}

.field-block .value {
  margin: 0.3rem 0 0;
  color: #292524;
  line-height: 1.55;
  word-break: break-word;
}

.field-block .bio {
  white-space: pre-wrap;
  color: #44403c;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field,
:deep(.p-inputtext),
:deep(.p-textarea) {
  width: 100%;
}

:deep(.p-inputtext),
:deep(.p-textarea) {
  background: #fff !important;
  border: 1px solid #e7e5e4 !important;
  color: #1c1917 !important;
}

:deep(.p-inputtext:enabled:focus),
:deep(.p-textarea:enabled:focus) {
  border-color: rgba(217, 119, 6, 0.55) !important;
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.25) !important;
}

:deep(.p-inputtext:disabled) {
  opacity: 0.75;
  background: #f5f5f4 !important;
  color: #78716c !important;
}

.field-hint {
  font-size: 0.8125rem;
  color: #a8a29e;
}

.edit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.25rem;
}

.save-btn {
  border: none !important;
  background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%) !important;
  color: #1c1917 !important;
  font-weight: 700 !important;
}

.cancel-btn {
  color: #78716c !important;
}

.edit-notice {
  margin: 1rem 0 0;
  padding: 0.75rem 0.85rem;
  border-radius: 0.5rem;
  background: #fff7ed;
  color: #92400e;
  font-size: 0.875rem;
  line-height: 1.5;
}

.section-desc {
  margin: 0 0 0.85rem;
  color: #78716c;
  line-height: 1.55;
  font-size: 0.9375rem;
}

.reviews-link {
  display: inline-flex;
  align-items: center;
  color: #b45309;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.15s ease;
}

.reviews-link:hover {
  color: #d97706;
  text-decoration: underline;
}

.coming-soon {
  margin: 0.65rem 0 0;
  font-size: 0.8125rem;
  color: #a8a29e;
}

.logout-btn {
  border-color: #d6d3d1 !important;
  color: #57534e !important;
}

.logout-btn:hover {
  border-color: #b45309 !important;
  color: #b45309 !important;
  background: #fff7ed !important;
}

@media (max-width: 640px) {
  .profile {
    padding: 1.5rem 1rem 2.75rem;
  }

  .profile-panel,
  .reviews-panel,
  .account-panel {
    padding: 1.25rem 1.05rem;
  }

  .profile-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .avatar-wrap {
    width: 5.5rem;
    height: 5.5rem;
  }

  .avatar-fallback {
    font-size: 1.7rem;
  }

  .identity {
    width: 100%;
  }

  .edit-btn {
    width: 100%;
  }

  .edit-actions {
    flex-direction: column;
  }

  .edit-actions :deep(.p-button) {
    width: 100%;
  }
}
</style>
