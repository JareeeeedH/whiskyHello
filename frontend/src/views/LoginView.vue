<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'

type AuthMode = 'login' | 'register'

const mode = ref<AuthMode>('login')
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

function switchMode(next: AuthMode) {
  mode.value = next
}

function onSubmit() {
  // UI only — backend auth will be wired in a later task.
}
</script>

<template>
  <main class="auth">
    <h1>{{ mode === 'login' ? '登入' : '註冊' }}</h1>

    <div class="mode-switch">
      <button
        type="button"
        class="mode-btn"
        :class="{ active: mode === 'login' }"
        @click="switchMode('login')"
      >
        登入
      </button>
      <button
        type="button"
        class="mode-btn"
        :class="{ active: mode === 'register' }"
        @click="switchMode('register')"
      >
        註冊
      </button>
    </div>

    <form class="form" @submit.prevent="onSubmit">
      <label v-if="mode === 'register'">
        Name
        <InputText v-model="name" autocomplete="name" class="field" />
      </label>
      <label>
        Email
        <InputText v-model="email" type="email" autocomplete="email" class="field" />
      </label>
      <label>
        Password
        <Password v-model="password" :feedback="false" toggle-mask input-class="field" />
      </label>
      <label v-if="mode === 'register'">
        Confirm Password
        <Password
          v-model="confirmPassword"
          :feedback="false"
          toggle-mask
          input-class="field"
        />
      </label>
      <Button
        type="submit"
        :label="mode === 'login' ? 'Login' : 'Register'"
      />
    </form>
  </main>
</template>

<style scoped>
.auth {
  max-width: 420px;
  margin: 0 auto;
  padding: 1.5rem;
}

.mode-switch {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0 0;
}

.mode-btn {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  cursor: pointer;
}

.mode-btn.active {
  border-color: #0f766e;
  color: #0f766e;
  font-weight: 600;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #334155;
}

.field,
:deep(.p-password) {
  width: 100%;
}

h1 {
  margin: 0;
}
</style>
