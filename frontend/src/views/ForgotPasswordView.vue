<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import { useToast } from 'primevue/usetoast'
import AuthTastingNote from '../components/AuthTastingNote.vue'
import { AuthApiError, requestPasswordReset } from '../services/authService'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const MAIL_FAILED_MESSAGE = '驗證信寄送失敗，請稍後再試'
const TOO_MANY_REQUESTS_MESSAGE = '操作太頻繁，請稍後再試'
const RESEND_COOLDOWN_MESSAGE = '操作太頻繁，請稍後再試（重寄需間隔 90 秒）'
const GOOGLE_ACCOUNT_MESSAGE = '此帳號使用 Google 登入，請直接使用 Google 登入'

const email = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const sentEmail = ref('')
const loading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')

const codeSent = computed(() => sentEmail.value !== '')

function sendErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof AuthApiError)) {
    return fallback
  }
  if (error.status === 409) {
    return GOOGLE_ACCOUNT_MESSAGE
  }
  if (error.status === 503) {
    return MAIL_FAILED_MESSAGE
  }
  if (error.status === 429) {
    return error.message.includes('90 seconds')
      ? RESEND_COOLDOWN_MESSAGE
      : TOO_MANY_REQUESTS_MESSAGE
  }
  if (error.status === 400 && error.details.length > 0) {
    return error.details.join('；')
  }
  return error.message
}

function onSubmit() {
  if (codeSent.value) {
    void onReset()
  } else {
    void onSendCode()
  }
}

async function sendCode(target: string) {
  errorMessage.value = ''
  infoMessage.value = ''
  loading.value = true

  try {
    await requestPasswordReset(target)
    sentEmail.value = target
    infoMessage.value = '若此 Email 有註冊帳號，驗證碼已寄出，請於 10 分鐘內輸入'
  } catch (error) {
    errorMessage.value = sendErrorMessage(error, '寄送驗證碼失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}

async function onSendCode() {
  if (loading.value) {
    return
  }

  const trimmedEmail = email.value.trim().toLowerCase()
  if (!trimmedEmail) {
    errorMessage.value = '請輸入 Email'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errorMessage.value = '請輸入有效的 Email'
    return
  }

  await sendCode(trimmedEmail)
}

async function onResend() {
  if (loading.value) {
    return
  }
  await sendCode(sentEmail.value)
}

function validateReset(): string | null {
  if (!/^\d{6}$/.test(code.value.trim())) {
    return '請輸入 6 位數驗證碼'
  }
  if (password.value.length < 8) {
    return '新密碼至少需要 8 個字元'
  }
  if (password.value !== confirmPassword.value) {
    return '兩次輸入的密碼不一致'
  }
  return null
}

async function onReset() {
  if (loading.value) {
    return
  }

  errorMessage.value = ''

  const clientError = validateReset()
  if (clientError) {
    errorMessage.value = clientError
    return
  }

  loading.value = true

  try {
    await authStore.resetPassword({
      email: sentEmail.value,
      code: code.value.trim(),
      password: password.value,
    })
    toast.add({
      severity: 'success',
      summary: '密碼已重設，歡迎回到 WhiskyHello',
      life: 1800,
    })
    void router.push('/')
  } catch (error) {
    infoMessage.value = ''
    if (
      error instanceof AuthApiError &&
      error.status === 400 &&
      error.details.length === 0
    ) {
      errorMessage.value = '驗證碼錯誤或已過期（錯誤 5 次需重新寄送驗證碼）'
    } else {
      errorMessage.value = sendErrorMessage(error, '重設密碼失敗，請稍後再試')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="forgot-page">
    <AuthTastingNote class="auth-note" />

    <div class="forgot-shell">
      <div class="forgot-card">
        <p class="brand">WhiskyHello</p>
        <h1>忘記密碼</h1>
        <p class="subtitle">輸入註冊的 Email，我們會寄送驗證碼給你</p>

        <form class="form" @submit.prevent="onSubmit">
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
          <template v-if="codeSent">
            <label>
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
            <label>
              New Password
              <Password
                v-model="password"
                :feedback="false"
                toggle-mask
                placeholder="至少 8 個字元"
                input-class="field"
                :disabled="loading"
              />
            </label>
            <label>
              Confirm Password
              <Password
                v-model="confirmPassword"
                :feedback="false"
                toggle-mask
                placeholder="再輸入一次新密碼"
                input-class="field"
                :disabled="loading"
              />
            </label>
          </template>

          <p v-if="errorMessage" class="form-message is-error" role="alert">
            {{ errorMessage }}
          </p>
          <p v-else-if="infoMessage" class="form-message is-success" role="status">
            {{ infoMessage }}
          </p>

          <Button
            type="submit"
            :label="codeSent ? '重設密碼' : '寄送驗證碼'"
            class="submit-btn"
            :loading="loading"
            :disabled="loading"
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

        <p class="login-hint">
          想起密碼了？
          <RouterLink to="/login">返回登入</RouterLink>
        </p>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Two columns: a tasting note on the left, the form on the right. */
.forgot-page {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  min-height: calc(100vh - 3.5rem);
  background: var(--wh-night);
  color: var(--wh-cream);
}

.forgot-shell {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 3rem clamp(1.5rem, 5vw, 4.5rem);
}

.forgot-card {
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
  .forgot-page {
    grid-template-columns: minmax(0, 1fr);
    align-content: start;
  }

  .forgot-shell {
    padding: 2rem 1rem 2.25rem;
  }

  .forgot-card {
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
