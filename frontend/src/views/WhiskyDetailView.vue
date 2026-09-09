<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { getWhiskyById } from '../services/whiskyService'

const route = useRoute()

const whisky = computed(() => {
  const id = String(route.params.id ?? '')
  return getWhiskyById(id)
})
</script>

<template>
  <main class="detail">
    <p>
      <RouterLink to="/whiskies">← Back to search</RouterLink>
    </p>

    <template v-if="whisky">
      <img
        v-if="whisky.imageUrl"
        :src="whisky.imageUrl"
        :alt="whisky.name"
        class="image"
      />
      <h1>{{ whisky.name }}</h1>
      <p v-if="whisky.subtitle">{{ whisky.subtitle }}</p>
      <p v-if="whisky.sgp" class="meta"><strong>SGP:</strong> {{ whisky.sgp }}</p>
      <p v-if="whisky.points !== undefined" class="meta">
        <strong>Points:</strong> {{ whisky.points }}
      </p>
      <p v-if="whisky.score" class="meta"><strong>Score:</strong> {{ whisky.score }}</p>
      <p v-if="whisky.note" class="note">{{ whisky.note }}</p>
    </template>

    <h2 v-else>Whisky not found</h2>
  </main>
</template>

<style scoped>
.detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem 2rem;
}

.image {
  display: block;
  width: min(200px, 100%);
  height: auto;
  max-height: 220px;
  object-fit: contain;
  margin-bottom: 1rem;
  background: #f8fafc;
}

.note {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #334155;
}

.meta {
  color: #334155;
}

h1,
h2,
p {
  margin: 0 0 0.75rem;
}

a {
  color: #0f766e;
  text-decoration: none;
}

@media (max-width: 640px) {
  .detail {
    padding: 1rem;
  }
}
</style>
