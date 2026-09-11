<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import SocialAuthButtons from '../components/SocialAuthButtons.vue'
import { AuthApiError, registerUser } from '../services/authService'

const router = useRouter()

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
</script>

<template>
  <main class="register-page">
    <div class="glow glow-a" aria-hidden="true" />
    <div class="glow glow-b" aria-hidden="true" />

    <div class="register-shell">
      <div class="register-card">
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

        <SocialAuthButtons mode="register" />

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

.form-message.is-success {
  color: #86efac;
}

.submit-btn {
  margin-top: 0.4rem;
  width: 100%;
  border: none !important;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 45%, #d97706 100%) !important;
  color: #1c1917 !important;
  font-weight: 700 !important;
  box-shadow: 0 10px 28px rgba(217, 119, 6, 0.35) !important;
  transition: filter 0.15s ease, transform 0.15s ease !important;
}

.submit-btn:hover:not(:disabled) {
  filter: brightness(1.06);
  transform: translateY(-1px);
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

.tagline {
  margin: 1.35rem 0 0;
  text-align: center;
  font-size: 0.875rem;
  color: #78716c;
  letter-spacing: 0.02em;
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
    font-size: 1.6rem;
  }
}
</style>
