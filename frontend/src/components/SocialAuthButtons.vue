<script setup lang="ts">
defineProps<{
  mode: 'login' | 'register'
}>()
</script>

<template>
  <div class="social-auth">
    <div class="divider" role="separator">
      <span class="divider-line" aria-hidden="true" />
      <span class="divider-text">
        {{ mode === 'login' ? 'or' : 'or' }}
      </span>
      <span class="divider-line" aria-hidden="true" />
    </div>

    <div class="social-actions">
      <button
        type="button"
        class="social-btn social-btn-google"
        :aria-label="mode === 'login' ? '使用 Google 登入' : '使用 Google 註冊'"
        :title="mode === 'login' ? '使用 Google 登入' : '使用 Google 註冊'"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.3 14.7 2.3 12 2.3 6.8 2.3 2.5 6.6 2.5 11.8S6.8 21.3 12 21.3c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z"
          />
          <path
            fill="#34A853"
            d="M3.9 7.4 7.1 9.8C8 7.7 9.8 6.2 12 6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.3 14.7 2.3 12 2.3 8.4 2.3 5.3 4.3 3.9 7.4z"
          />
          <path
            fill="#4A90E2"
            d="M12 21.3c2.6 0 4.8-.9 6.4-2.3l-3-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1l-3.2 2.5c1.5 3 4.5 5.4 8.8 5.4z"
          />
          <path
            fill="#FBBC05"
            d="M6.4 13.4c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8L3.2 7.3C2.7 8.5 2.5 9.8 2.5 11.6c0 1.8.2 3.1.7 4.3l3.2-2.5z"
          />
        </svg>
      </button>

      <button
        type="button"
        class="social-btn social-btn-apple"
        :aria-label="mode === 'login' ? '使用 Apple 登入' : '使用 Apple 註冊'"
        :title="mode === 'login' ? '使用 Apple 登入' : '使用 Apple 註冊'"
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
  gap: 0.75rem;
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

.social-btn:hover {
  transform: translateY(-1px);
}

.social-btn-google {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: #fff;
  color: #1c1917;
}

.social-btn-google:hover {
  background: #f5f5f4;
}

.social-btn-google:focus-visible {
  outline: 2px solid #fbbf24;
  outline-offset: 2px;
}

.social-btn-apple {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: #000;
  color: #fff;
}

.social-btn-apple:hover {
  background: #111;
}

.social-btn-apple:focus-visible {
  outline: 2px solid #fbbf24;
  outline-offset: 2px;
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
