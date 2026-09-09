<script setup lang="ts">
import { ref } from 'vue'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'

/** Placeholder profile fields — not connected to backend yet. */
const name = ref('')
const email = ref('')
const avatar = ref('')
const bio = ref('')
</script>

<template>
  <main class="profile">
    <h1>Profile</h1>
    <p class="hint">Basic profile UI (not connected to backend yet).</p>

    <div class="form">
      <label>
        Name
        <InputText v-model="name" class="field" />
      </label>
      <label>
        Email
        <InputText v-model="email" type="email" class="field" />
      </label>
      <label>
        Avatar
        <InputText v-model="avatar" placeholder="Avatar URL" class="field" />
      </label>
      <label>
        Bio
        <Textarea v-model="bio" rows="4" class="field" auto-resize />
      </label>
    </div>
  </main>
</template>

<style scoped>
.profile {
  max-width: 520px;
  margin: 0 auto;
  padding: 1.5rem;
}

.hint {
  color: #64748b;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #334155;
}

.field {
  width: 100%;
}

h1,
p {
  margin: 0 0 0.5rem;
}
</style>
