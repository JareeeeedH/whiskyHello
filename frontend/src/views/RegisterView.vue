<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import SocialAuthButtons from '../components/SocialAuthButtons.vue'
import AuthTastingNote from '../components/AuthTastingNote.vue'
import {
  AuthApiError,
  registerUser,
  resendRegistrationCode,
} from '../services/authService'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const MAIL_FAILED_MESSAGE = '驗證信寄送失敗，請稍後再試'
const TOO_MANY_REQUESTS_MESSAGE = '操作太頻繁，請稍後再試'
const RESEND_COOLDOWN_MESSAGE = '操作太頻繁，請稍後再試（重寄需間隔 90 秒）'

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const code = ref('')
const sentEmail = ref('')
const loading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')

const codeSent = computed(() => sentEmail.value !== '')
const canSubmit = computed(() => !loading.value)

function sendErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof AuthApiError)) {
    return fallback
  }
  if (error.status === 503) {
    return MAIL_FAILED_MESSAGE
  }
  if (error.status === 429) {
    return error.message.includes('90 seconds')
      ? RESEND_COOLDOWN_MESSAGE
      : TOO_MANY_REQUESTS_MESSAGE
  }
  return error.message
}

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

  if (password.value !== confirmPassword.value) {
    return '兩次輸入的密碼不一致'
  }

  return null
}

function onSubmit() {
  if (codeSent.value) {
    void onVerify()
  } else {
    void onRegister()
  }
}

async function onRegister() {
  if (loading.value) {
    return
  }

  errorMessage.value = ''
  infoMessage.value = ''

  const clientError = validateClient()
  if (clientError) {
    errorMessage.value = clientError
    return
  }

  loading.value = true

  try {
    const result = await registerUser({
      name: name.value.trim(),
      email: email.value.trim().toLowerCase(),
      password: password.value,
    })

    sentEmail.value = result.email
    infoMessage.value = `驗證碼已寄到 ${result.email}，請於 10 分鐘內輸入`
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 409) {
      errorMessage.value = '此 Email 已被註冊，請改用其他 Email 或前往登入'
    } else if (
      error instanceof AuthApiError &&
      error.status === 400 &&
      error.details.length > 0
    ) {
      errorMessage.value = error.details.join('；')
    } else {
      errorMessage.value = sendErrorMessage(error, '註冊失敗，請稍後再試')
    }
  } finally {
    loading.value = false
  }
}

async function onVerify() {
  if (loading.value) {
    return
  }

  errorMessage.value = ''

  const trimmedCode = code.value.trim()
  if (!/^\d{6}$/.test(trimmedCode)) {
    errorMessage.value = '請輸入 6 位數驗證碼'
    return
  }

  loading.value = true

  try {
    await authStore.verifyRegistration({
      email: sentEmail.value,
      code: trimmedCode,
    })
    toast.add({
      severity: 'success',
      summary: '註冊成功，歡迎加入 WhiskyHello',
      life: 1800,
    })
    void router.push('/')
  } catch (error) {
    infoMessage.value = ''
    if (error instanceof AuthApiError && error.status === 400) {
      errorMessage.value = '驗證碼錯誤或已過期'
    } else if (error instanceof AuthApiError && error.status === 409) {
      errorMessage.value = '此 Email 已被註冊，請前往登入'
    } else {
      errorMessage.value = sendErrorMessage(error, '驗證失敗，請稍後再試')
    }
  } finally {
    loading.value = false
  }
}

async function onResend() {
  if (loading.value) {
    return
  }

  errorMessage.value = ''
  infoMessage.value = ''
  loading.value = true

  try {
    await resendRegistrationCode(sentEmail.value)
    infoMessage.value = `已重新寄出驗證碼到 ${sentEmail.value}`
  } catch (error) {
    errorMessage.value = sendErrorMessage(error, '重寄驗證碼失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}

async function onGoogleCredential(credential: string) {
  if (loading.value) {
    return
  }

  errorMessage.value = ''
  infoMessage.value = ''
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
    <AuthTastingNote class="auth-note" />

    <div class="register-shell">
      <div class="register-card">
        <p class="brand">WhiskyHello</p>
        <h1>註冊</h1>
        <p class="subtitle">建立你的威你好帳號</p>

        <form class="form" @submit.prevent="onSubmit">
          <label>
            Name
            <InputText
              v-model="name"
              type="text"
              autocomplete="name"
              placeholder="你的顯示名稱"
              class="field"
              :disabled="loading || codeSent"
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
              :disabled="loading || codeSent"
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
              :disabled="loading || codeSent"
            />
          </label>
          <label>
            Confirm Password
            <Password
              v-model="confirmPassword"
              :feedback="false"
              toggle-mask
              placeholder="再輸入一次密碼"
              input-class="field"
              :disabled="loading || codeSent"
            />
          </label>
          <label v-if="codeSent">
            驗證碼
            <InputText
              v-model="code"
              type="text"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="6 位數驗證碼"
              class="field"
              :disabled="loading"
            />
          </label>

          <p v-if="errorMessage" class="form-message is-error" role="alert">
            {{ errorMessage }}
          </p>
          <p v-else-if="infoMessage" class="form-message is-success" role="status">
            {{ infoMessage }}
          </p>

          <Button
            type="submit"
            :label="codeSent ? '完成驗證' : '註冊'"
            class="submit-btn"
            :loading="loading"
            :disabled="!canSubmit"
          />
          <Button
            v-if="codeSent"
            type="button"
            label="重寄驗證碼"
            text
            class="resend-btn"
            :disabled="loading"
            @click="onResend"
          />
        </form>

        <SocialAuthButtons
          mode="register"
          :disabled="loading"
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
/* Two columns: a tasting note on the left, the form on the right. */
.register-page {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  min-height: calc(100vh - 3.5rem);
  background: var(--wh-night);
  color: var(--wh-cream);
}

.register-shell {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 3rem clamp(1.5rem, 5vw, 4.5rem);
}

.register-card {
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

.form-message.is-success {
  color: #86efac;
}

.submit-btn {
  margin-top: 0.4rem;
  width: 100%;
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

.resend-btn {
  align-self: center;
  color: var(--wh-gold-bright) !important;
}

.login-hint {
  margin: 1.75rem 0 0;
  color: var(--wh-mauve);
  font-size: 0.9375rem;
}

.login-hint a {
  color: var(--wh-gold-bright);
  font-weight: 600;
  text-decoration: none;
}

.login-hint a:hover {
  text-decoration: underline;
}

@media (max-width: 860px) {
  .register-page {
    grid-template-columns: minmax(0, 1fr);
    align-content: start;
  }

  .register-shell {
    padding: 2rem 1rem 2.25rem;
  }

  .register-card {
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
