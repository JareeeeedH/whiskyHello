<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import SocialAuthButtons from '../components/SocialAuthButtons.vue'
import { AuthApiError, registerUser } from '../services/authService'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const canSubmit = computed(
  () => !loading.value && successMessage.value === '',
)

function validateClient(): string | null {
  const trimmedName = name.value.trim()
  const trimmedEmail = email.value.trim()

  if (!trimmedName) {
    return '請輸入名稱'
  }

  if (!trimmedEmail) {
    return '請輸入 Email'
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return '請輸入有效的 Email'
  }

  if (!password.value) {
    return '請輸入密碼'
  }

  if (password.value.length < 8) {
    return '密碼至少需要 8 個字元'
  }

  return null
}

async function onRegister() {
  if (loading.value || successMessage.value) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  const clientError = validateClient()
  if (clientError) {
    errorMessage.value = clientError
    return
  }

  loading.value = true

  try {
    await registerUser({
      name: name.value.trim(),
      email: email.value.trim().toLowerCase(),
      password: password.value,
    })

    successMessage.value = '註冊成功，即將前往登入頁…'
    window.setTimeout(() => {
      void router.push('/login')
    }, 900)
  } catch (error) {
    if (error instanceof AuthApiError) {
      if (error.status === 409) {
        errorMessage.value = '此 Email 已被註冊，請改用其他 Email 或前往登入'
      } else if (error.status === 400 && error.details.length > 0) {
        errorMessage.value = error.details.join('；')
      } else {
        errorMessage.value = error.message
      }
    } else {
      errorMessage.value = '註冊失敗，請稍後再試'
    }
  } finally {
    loading.value = false
  }
}

async function onGoogleCredential(credential: string) {
  if (loading.value || successMessage.value) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  loading.value = true

  try {
    await authStore.loginWithGoogle(credential)
    toast.add({
      severity: 'success',
      summary: '登入成功，歡迎回到 WhiskyHello',
      life: 1800,
    })
    void router.push('/')
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
  <main class="register-page">
    <div class="atmosphere" aria-hidden="true">
      <div class="grain" />
      <div class="glow glow-a" />
      <div class="glow glow-b" />
      <div class="glow glow-edge" />
    </div>

    <div class="register-shell auth-reveal">
      <div class="register-card">
        <p class="brand">WhiskyHello</p>
        <h1>註冊</h1>
        <p class="subtitle">建立你的威你好帳號</p>

        <form class="form" @submit.prevent="onRegister">
          <label>
            Name
            <InputText
              v-model="name"
              type="text"
              autocomplete="name"
              placeholder="你的顯示名稱"
              class="field"
              :disabled="loading || Boolean(successMessage)"
            />
          </label>
          <label>
            Email
            <InputText
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="your@email.com"
              class="field"
              :disabled="loading || Boolean(successMessage)"
            />
          </label>
          <label>
            Password
            <Password
              v-model="password"
              :feedback="false"
              toggle-mask
              placeholder="至少 8 個字元"
              input-class="field"
              :disabled="loading || Boolean(successMessage)"
            />
          </label>

          <p v-if="errorMessage" class="form-message is-error" role="alert">
            {{ errorMessage }}
          </p>
          <p v-else-if="successMessage" class="form-message is-success" role="status">
            {{ successMessage }}
          </p>

          <Button
            type="submit"
            label="註冊"
            class="submit-btn"
            :loading="loading"
            :disabled="!canSubmit"
          />
        </form>

        <SocialAuthButtons
          mode="register"
          :disabled="loading || Boolean(successMessage)"
          @credential="onGoogleCredential"
          @error="onGoogleError"
        />

        <p class="login-hint">
          已經有帳號？
          <RouterLink to="/login">登入</RouterLink>
        </p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.register-page {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 3.5rem);
  padding: 2.5rem 1.25rem;
  background:
    radial-gradient(ellipse 70% 60% at 15% 10%, rgba(180, 83, 9, 0.22), transparent 55%),
    radial-gradient(ellipse 55% 50% at 90% 85%, rgba(146, 64, 14, 0.18), transparent 50%),
    linear-gradient(165deg, #0c0a09 0%, #1c1917 42%, #292524 72%, #0c0a09 100%);
  color: #fafaf9;
}

.atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.grain {
  position: absolute;
  inset: 0;
  opacity: 0.12;
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255, 255, 255, 0.015) 2px,
      rgba(255, 255, 255, 0.015) 3px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.04) 2px,
      rgba(0, 0, 0, 0.04) 3px
    );
  mix-blend-mode: soft-light;
}

.glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(64px);
}

.glow-a {
  top: -12%;
  left: -8%;
  width: 26rem;
  height: 26rem;
  background: rgba(217, 119, 6, 0.26);
}

.glow-b {
  right: -10%;
  bottom: -18%;
  width: 24rem;
  height: 24rem;
  background: rgba(251, 191, 36, 0.14);
}

.glow-edge {
  top: 35%;
  left: 50%;
  width: 18rem;
  height: 18rem;
  transform: translate(-50%, -50%);
  background: rgba(245, 158, 11, 0.08);
}

.register-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
}

.register-card {
  padding: 2.25rem 1.85rem 1.85rem;
  border-radius: 1.1rem;
  background: linear-gradient(
    160deg,
    rgba(55, 48, 42, 0.55) 0%,
    rgba(28, 25, 23, 0.88) 48%,
    rgba(12, 10, 9, 0.92) 100%
  );
  border: 1px solid rgba(251, 191, 36, 0.32);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.08) inset,
    0 0 0 1px rgba(120, 53, 15, 0.2) inset,
    0 24px 56px rgba(0, 0, 0, 0.5),
    0 0 48px rgba(217, 119, 6, 0.12);
  backdrop-filter: blur(14px);
}

.brand {
  margin: 0 0 0.85rem;
  text-align: center;
  font-family: var(--font-body);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: #fbbf24;
  text-shadow: 0 0 24px rgba(251, 191, 36, 0.35);
}

h1 {
  margin: 0 0 0.4rem;
  text-align: center;
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 4vw, 1.9rem);
  font-weight: 600;
  letter-spacing: normal;
  line-height: 1.25;
  color: #fafaf9;
}

.subtitle {
  margin: 0 0 1.55rem;
  text-align: center;
  font-family: var(--font-body);
  color: #a8a29e;
  line-height: 1.55;
  font-weight: 400;
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
  background: rgba(12, 10, 9, 0.72) !important;
  border: 1px solid rgba(168, 162, 158, 0.28) !important;
  color: #fafaf9 !important;
  box-shadow: none !important;
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease !important;
}

:deep(.p-inputtext::placeholder),
:deep(.p-password-input::placeholder) {
  color: #78716c !important;
}

:deep(.p-inputtext:enabled:focus),
:deep(.p-password-input:enabled:focus) {
  border-color: rgba(251, 191, 36, 0.65) !important;
  box-shadow:
    0 0 0 1px rgba(251, 191, 36, 0.22),
    0 0 20px rgba(217, 119, 6, 0.18) !important;
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

.form-message.is-success {
  color: #86efac;
}

.submit-btn {
  margin-top: 0.4rem;
  width: 100%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, transparent 42%),
    linear-gradient(135deg, #fbbf24 0%, #f59e0b 42%, #d97706 78%, #b45309 100%) !important;
  border: 1px solid rgba(253, 230, 138, 0.55) !important;
  color: #1c1917 !important;
  font-weight: 600 !important;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.28) inset,
    0 -1px 0 rgba(120, 53, 15, 0.3) inset,
    0 12px 28px rgba(217, 119, 6, 0.3) !important;
  transition:
    filter 0.3s ease,
    box-shadow 0.3s ease,
    transform 0.3s ease !important;
}

.submit-btn:hover:not(:disabled) {
  filter: brightness(1.06);
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.35) inset,
    0 0 0 1px rgba(253, 230, 138, 0.28),
    0 14px 28px rgba(180, 83, 9, 0.28) !important;
}

.login-hint {
  margin: 1.35rem 0 0;
  text-align: center;
  color: #a8a29e;
  font-size: 0.9375rem;
}

.login-hint a {
  color: #fbbf24;
  font-weight: 600;
  text-decoration: none;
  text-shadow: 0 0 16px rgba(251, 191, 36, 0.25);
}

.login-hint a:hover {
  text-decoration: underline;
}

.auth-reveal {
  animation: auth-fade-up 0.85s ease both;
}

@keyframes auth-fade-up {
  from {
    opacity: 0;
    transform: translateY(0.7rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 480px) {
  .register-page {
    padding: 1.5rem 1rem;
  }

  .register-card {
    padding: 1.75rem 1.25rem 1.5rem;
    border-radius: 0.95rem;
  }

  h1 {
    font-size: 1.65rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-reveal {
    animation: none;
  }

  .submit-btn {
    transition: none !important;
  }

  .submit-btn:hover:not(:disabled) {
    transform: none;
  }
}
</style>
