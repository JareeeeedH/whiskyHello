<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import SocialAuthButtons from '../components/SocialAuthButtons.vue'
import AuthTastingNote from '../components/AuthTastingNote.vue'
import { AuthApiError } from '../services/authService'
import { useAuthStore } from '../stores/auth'
import { resolvePostLoginPath } from '../utils/safeRedirect'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

const canSubmit = computed(() => !loading.value)

function notifyLoginSuccess() {
  toast.add({
    severity: 'success',
    summary: '登入成功，歡迎回到 WhiskyHello',
    life: 1800,
  })
}

function validateClient(): string | null {
  const trimmedEmail = email.value.trim()

  if (!trimmedEmail) {
    return '請輸入 Email'
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return '請輸入有效的 Email'
  }

  if (!password.value) {
    return '請輸入密碼'
  }

  return null
}

async function onLogin() {
  if (loading.value) {
    return
  }

  errorMessage.value = ''

  const clientError = validateClient()
  if (clientError) {
    errorMessage.value = clientError
    return
  }

  loading.value = true

  try {
    await authStore.login({
      email: email.value.trim().toLowerCase(),
      password: password.value,
    })
    notifyLoginSuccess()
    void router.push(resolvePostLoginPath(route.query.redirect))
  } catch (error) {
    if (error instanceof AuthApiError) {
      if (error.status === 401) {
        errorMessage.value =
          error.message.includes('Google')
            ? '此帳號請使用 Google 登入'
            : 'Email 或密碼錯誤，請再試一次'
      } else if (error.status === 400 && error.details.length > 0) {
        errorMessage.value = error.details.join('；')
      } else if (error.status === 400) {
        errorMessage.value = error.message || '資料驗證失敗'
      } else {
        errorMessage.value = error.message
      }
    } else {
      errorMessage.value = '登入失敗，請稍後再試'
    }
  } finally {
    loading.value = false
  }
}

async function onGoogleCredential(credential: string) {
  if (loading.value) {
    return
  }

  errorMessage.value = ''
  loading.value = true

  try {
    await authStore.loginWithGoogle(credential)
    notifyLoginSuccess()
    void router.push(resolvePostLoginPath(route.query.redirect))
  } catch (error) {
    if (error instanceof AuthApiError) {
      if (error.status === 409) {
        errorMessage.value =
          '此 Email 已有帳號，請改用 Email / 密碼登入（暫不支援自動綁定 Google）'
      } else if (error.status === 503) {
        errorMessage.value = '伺服器尚未啟用 Google 登入，請稍後再試'
      } else if (error.status === 401 || error.status === 400) {
        errorMessage.value = 'Google 登入失敗，請再試一次'
      } else {
        errorMessage.value = error.message
      }
    } else {
      errorMessage.value = 'Google 登入失敗，請稍後再試'
    }
  } finally {
    loading.value = false
  }
}

function onGoogleError(message: string) {
  errorMessage.value = message
}
</script>

<template>
  <main class="login-page">
    <AuthTastingNote class="auth-note" />

    <div class="login-shell">
      <div class="login-card">
        <p class="brand">WhiskyHello</p>
        <h1>登入</h1>
        <p class="subtitle">歡迎回到威你好</p>

        <form class="form" @submit.prevent="onLogin">
          <label>
            Email
            <InputText
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="your@email.com"
              class="field"
              :disabled="loading"
            />
          </label>
          <label>
            Password
            <Password
              v-model="password"
              :feedback="false"
              toggle-mask
              placeholder="請輸入密碼"
              input-class="field"
              :disabled="loading"
            />
          </label>

          <p v-if="errorMessage" class="form-message is-error" role="alert">
            {{ errorMessage }}
          </p>

          <div class="form-actions">
            <Button
              type="submit"
              label="登入"
              class="submit-btn"
              :loading="loading"
              :disabled="!canSubmit"
            />
            <RouterLink to="/forgot-password" class="forgot-link">
              忘記密碼？
            </RouterLink>
          </div>
        </form>

        <SocialAuthButtons
          mode="login"
          :disabled="loading"
          @credential="onGoogleCredential"
          @error="onGoogleError"
        />

        <p class="register-hint">
          還沒有帳號？
          <RouterLink to="/register">註冊</RouterLink>
        </p>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Two columns: a tasting note on the left, the form on the right. */
.login-page {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  min-height: calc(100vh - 3.5rem);
  background: var(--wh-night);
  color: var(--wh-cream);
}

.login-shell {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 3rem clamp(1.5rem, 5vw, 4.5rem);
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.brand {
  margin: 0 0 2rem;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: var(--fw-display);
  color: var(--wh-gold-bright);
}

h1 {
  margin: 0 0 0.35rem;
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 3vw, 2.125rem);
  font-weight: var(--fw-display);
  line-height: 1.25;
  color: var(--wh-cream);
}

.subtitle {
  margin: 0 0 2rem;
  color: var(--wh-mauve);
  font-size: var(--fs-body-sm);
  line-height: 1.6;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--wh-cream);
}

.field,
:deep(.p-password),
:deep(.p-password-input),
:deep(.p-inputtext) {
  width: 100%;
}

:deep(.p-inputtext),
:deep(.p-password-input) {
  background: var(--wh-night-raised) !important;
  border: 1px solid rgba(241, 233, 220, 0.16) !important;
  color: var(--wh-cream) !important;
  box-shadow: none !important;
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease !important;
}

:deep(.p-inputtext::placeholder),
:deep(.p-password-input::placeholder) {
  color: rgba(169, 156, 166, 0.75) !important;
}

:deep(.p-inputtext:enabled:focus),
:deep(.p-password-input:enabled:focus) {
  border-color: var(--wh-gold-bright) !important;
  box-shadow: 0 0 0 1px rgba(220, 184, 120, 0.35) !important;
}

:deep(.p-password-toggle-mask-icon) {
  color: var(--wh-mauve) !important;
}

.form-message {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.45;
}

.form-message.is-error {
  color: #fca5a5;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 1rem;
  margin-top: 0.25rem;
}

.submit-btn {
  width: auto;
  min-width: 7.5rem;
  border: 0 !important;
  border-radius: 6px !important;
  background: var(--wh-gold-bright) !important;
  color: var(--wh-night) !important;
  font-weight: 600 !important;
  box-shadow: none !important;
  transition: background 0.2s ease !important;
}

.submit-btn:hover:not(:disabled) {
  background: var(--wh-gold) !important;
}

.submit-btn:focus-visible {
  outline: 2px solid var(--wh-cream);
  outline-offset: 2px;
}

.forgot-link {
  padding: 0;
  border: none;
  background: none;
  color: var(--wh-mauve);
  font-size: 0.875rem;
  text-decoration: none;
  cursor: pointer;
}

.forgot-link:hover {
  color: var(--wh-gold-bright);
  text-decoration: underline;
}

.forgot-link:focus-visible {
  outline: 2px solid var(--wh-gold-bright);
  outline-offset: 2px;
  border-radius: 2px;
}

.register-hint {
  margin: 1.75rem 0 0;
  color: var(--wh-mauve);
  font-size: 0.9375rem;
}

.register-hint a {
  color: var(--wh-gold-bright);
  font-weight: 600;
  text-decoration: none;
}

.register-hint a:hover {
  text-decoration: underline;
}

@media (max-width: 860px) {
  .login-page {
    grid-template-columns: minmax(0, 1fr);
    align-content: start;
  }

  .login-shell {
    padding: 2rem 1rem 2.25rem;
  }

  .login-card {
    margin: 0 auto;
  }

  .auth-note {
    order: 2;
  }

  .brand {
    margin-bottom: 1.25rem;
  }

  h1 {
    font-size: 1.75rem;
  }

  .subtitle {
    margin-bottom: 1.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .submit-btn {
    transition: none !important;
  }
}
</style>
