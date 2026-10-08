<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import { useToast } from 'primevue/usetoast'
import { AuthApiError, requestPasswordReset } from '../services/authService'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const MAIL_FAILED_MESSAGE = '驗證信寄送失敗，請稍後再試'
const TOO_MANY_REQUESTS_MESSAGE = '操作太頻繁，請稍後再試（重寄需間隔 90 秒）'
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
    return TOO_MANY_REQUESTS_MESSAGE
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
    <div class="atmosphere" aria-hidden="true">
      <div class="grain" />
      <div class="glow glow-a" />
      <div class="glow glow-b" />
      <div class="glow glow-edge" />
    </div>

    <div class="forgot-shell auth-reveal">
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
.forgot-page {
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

.forgot-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
}

.forgot-card {
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

.resend-btn {
  align-self: center;
  color: #fbbf24 !important;
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
  .forgot-page {
    padding: 1.5rem 1rem;
  }

  .forgot-card {
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
