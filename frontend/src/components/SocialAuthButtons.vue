<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  mode: 'login' | 'register'
  disabled?: boolean
}>()

const emit = defineEmits<{
  credential: [credential: string]
  error: [message: string]
}>()

const googleButtonHost = ref<HTMLElement | null>(null)
const googleReady = ref(false)
const googleUnavailable = ref(false)

const GIS_SCRIPT_ID = 'whiskyhello-google-gsi'
const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential?: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number | boolean>,
          ) => void
          cancel: () => void
        }
      }
    }
  }
}

function getClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
}

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }

  const existing = document.getElementById(GIS_SCRIPT_ID)
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Sign-In')),
        { once: true },
      )
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = GIS_SCRIPT_ID
    script.src = GIS_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'))
    document.head.appendChild(script)
  })
}

function handleCredentialResponse(response: { credential?: string }) {
  const credential = response.credential?.trim()
  if (!credential) {
    emit('error', '無法取得 Google 登入憑證，請再試一次')
    return
  }
  emit('credential', credential)
}

function renderGoogleButton() {
  const clientId = getClientId()
  const host = googleButtonHost.value

  if (!clientId || !host || !window.google?.accounts?.id) {
    googleUnavailable.value = !clientId
    return
  }

  host.innerHTML = ''

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: handleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: true,
  })

  window.google.accounts.id.renderButton(host, {
    type: 'icon',
    shape: 'circle',
    theme: 'outline',
    size: 'large',
    text: props.mode === 'login' ? 'signin_with' : 'signup_with',
  })

  googleReady.value = true
  googleUnavailable.value = false
}

async function setupGoogle() {
  const clientId = getClientId()
  if (!clientId) {
    googleUnavailable.value = true
    return
  }

  try {
    await loadGisScript()
    renderGoogleButton()
  } catch {
    googleUnavailable.value = true
    emit('error', '無法載入 Google 登入，請稍後再試')
  }
}

onMounted(() => {
  void setupGoogle()
})

watch(
  () => props.disabled,
  () => {
    if (!props.disabled && googleButtonHost.value) {
      renderGoogleButton()
    }
  },
)

onBeforeUnmount(() => {
  try {
    window.google?.accounts?.id?.cancel()
  } catch {
    // ignore
  }
})
</script>

<template>
  <div class="social-auth">
    <div class="divider" role="separator">
      <span class="divider-line" aria-hidden="true" />
      <span class="divider-text">or</span>
      <span class="divider-line" aria-hidden="true" />
    </div>

    <div class="social-actions">
      <div
        class="google-btn-wrap"
        :class="{ 'is-disabled': disabled || googleUnavailable }"
        :aria-busy="!googleReady && !googleUnavailable"
      >
        <div
          ref="googleButtonHost"
          class="google-btn-host"
          :aria-label="mode === 'login' ? '使用 Google 登入' : '使用 Google 註冊'"
        />
        <p v-if="googleUnavailable" class="google-fallback">
          Google 登入尚未設定
        </p>
      </div>

      <button
        type="button"
        class="social-btn social-btn-apple"
        disabled
        aria-disabled="true"
        :aria-label="mode === 'login' ? '使用 Apple 登入（即將推出）' : '使用 Apple 註冊（即將推出）'"
        title="Apple 登入即將推出"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.3 1 8.3.7 1 1.5 2.1 2.6 2 1 0 1.5-.7 2.8-.7 1.3 0 1.7.7 2.8.6 1.2 0 1.9-1 2.6-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.1-3.2zM14.4 6.5c.6-.7 1-1.7.9-2.7-0.9.1-1.9.6-2.5 1.3-.6.6-1.1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2z"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.social-auth {
  margin-top: 1.25rem;
}

.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: rgba(168, 162, 158, 0.28);
}

.divider-text {
  flex-shrink: 0;
  font-size: 0.8125rem;
  color: #a8a29e;
  white-space: nowrap;
}

.social-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
}

.google-btn-wrap {
  position: relative;
  min-width: 2.75rem;
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.google-btn-wrap.is-disabled {
  opacity: 0.45;
  pointer-events: none;
}

.google-btn-host {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
}

.google-fallback {
  margin: 0;
  font-size: 0.7rem;
  color: #a8a29e;
  max-width: 5.5rem;
  text-align: center;
  line-height: 1.2;
}

.social-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border-radius: 0.55rem;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.15s ease;
}

.social-btn-apple {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: #000;
  color: #fff;
}

.social-btn-apple:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.social-btn-apple:disabled:hover {
  background: #000;
  transform: none;
}

@media (max-width: 480px) {
  .divider-text {
    font-size: 0.75rem;
  }

  .social-btn {
    width: 2.6rem;
    height: 2.6rem;
  }
}
</style>
