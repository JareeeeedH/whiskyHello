<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import SocialAuthButtons from '../components/SocialAuthButtons.vue'
import { AuthApiError } from '../services/authService'
import { useAuthStore } from '../stores/auth'
import { resolvePostLoginPath } from '../utils/safeRedirect'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

const canSubmit = computed(() => !loading.value)

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
    void router.push(resolvePostLoginPath(route.query.redirect))
  } catch (error) {
    if (error instanceof AuthApiError) {
      if (error.status === 409) {
        errorMessage.value =
          '此 Email 已有帳號，請改用 Email / 密碼登入（暫不支援自動綁定 Google）'
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
    <div class="glow glow-a" aria-hidden="true" />
    <div class="glow glow-b" aria-hidden="true" />

    <div class="login-shell">
      <div class="login-card">
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
            <button type="button" class="forgot-link">
              忘記密碼？
            </button>
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
.login-page {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 3.5rem);
  padding: 2.5rem 1.25rem;
  background:
    linear-gradient(165deg, #0c0a09 0%, #1c1917 45%, #0c0a09 100%);
  color: #fafaf9;
}

.glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(60px);
  pointer-events: none;
}

.glow-a {
  top: -10%;
  left: -5%;
  width: 420px;
  height: 420px;
  background: rgba(217, 119, 6, 0.28);
}

.glow-b {
  right: -8%;
  bottom: -15%;
  width: 380px;
  height: 380px;
  background: rgba(251, 191, 36, 0.14);
}

.login-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
}

.login-card {
  padding: 2.25rem 1.85rem 1.85rem;
  border-radius: 1.1rem;
  background: linear-gradient(
    160deg,
    rgba(41, 37, 36, 0.92) 0%,
    rgba(28, 25, 23, 0.96) 100%
  );
  border: 1px solid rgba(251, 191, 36, 0.22);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.03) inset,
    0 20px 50px rgba(0, 0, 0, 0.45),
    0 0 40px rgba(217, 119, 6, 0.12);
  backdrop-filter: blur(10px);
}

.brand {
  margin: 0 0 1.15rem;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #fbbf24;
  text-shadow: 0 0 24px rgba(251, 191, 36, 0.35);
}

h1 {
  margin: 0 0 0.4rem;
  text-align: center;
  font-size: 1.85rem;
  letter-spacing: -0.02em;
  color: #fafaf9;
}

.subtitle {
  margin: 0 0 1.6rem;
  text-align: center;
  color: #a8a29e;
  line-height: 1.5;
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
  font-size: 0.9rem;
  color: #d6d3d1;
}

.field,
:deep(.p-password),
:deep(.p-password-input),
:deep(.p-inputtext) {
  width: 100%;
}

:deep(.p-inputtext),
:deep(.p-password-input) {
  background: rgba(12, 10, 9, 0.65) !important;
  border: 1px solid rgba(168, 162, 158, 0.28) !important;
  color: #fafaf9 !important;
  box-shadow: none !important;
}

:deep(.p-inputtext::placeholder),
:deep(.p-password-input::placeholder) {
  color: #78716c !important;
}

:deep(.p-inputtext:enabled:focus),
:deep(.p-password-input:enabled:focus) {
  border-color: rgba(251, 191, 36, 0.65) !important;
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.25), 0 0 18px rgba(217, 119, 6, 0.2) !important;
}

:deep(.p-password-toggle-mask-icon) {
  color: #a8a29e !important;
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
  border: none !important;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 45%, #d97706 100%) !important;
  color: #1c1917 !important;
  font-weight: 700 !important;
  box-shadow: 0 8px 20px rgba(217, 119, 6, 0.3) !important;
  transition: filter 0.15s ease, transform 0.15s ease !important;
}

.submit-btn:hover:not(:disabled) {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.forgot-link {
  padding: 0;
  border: none;
  background: none;
  color: #a8a29e;
  font-size: 0.875rem;
  cursor: pointer;
}

.forgot-link:hover {
  color: #fbbf24;
  text-decoration: underline;
}

.forgot-link:focus-visible {
  outline: 2px solid #fbbf24;
  outline-offset: 2px;
  border-radius: 2px;
}

.register-hint {
  margin: 1.35rem 0 0;
  text-align: center;
  color: #a8a29e;
  font-size: 0.9375rem;
}

.register-hint a {
  color: #fbbf24;
  font-weight: 600;
  text-decoration: none;
  text-shadow: 0 0 16px rgba(251, 191, 36, 0.25);
}

.register-hint a:hover {
  text-decoration: underline;
}

.tagline {
  margin: 1.35rem 0 0;
  text-align: center;
  font-size: 0.875rem;
  color: #78716c;
  letter-spacing: 0.02em;
}

@media (max-width: 480px) {
  .login-page {
    padding: 1.5rem 1rem;
  }

  .login-card {
    padding: 1.75rem 1.25rem 1.5rem;
    border-radius: 0.95rem;
  }

  h1 {
    font-size: 1.6rem;
  }
}
</style>
