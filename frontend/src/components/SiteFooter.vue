<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { CONTACT_EMAIL as contactEmail } from '../constants/contact'
</script>

<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-grid">
        <div class="footer-brand">
          <p class="footer-name">WhiskyHello</p>
          <p class="footer-tagline">From one dram to the next.</p>
        </div>
        <nav class="footer-col" aria-label="法律資訊">
          <p class="footer-label">LEGAL</p>
          <RouterLink class="footer-link" to="/privacy">隱私權政策</RouterLink>
          <RouterLink class="footer-link" to="/terms">使用條款</RouterLink>
        </nav>
        <div class="footer-col">
          <p class="footer-label">GET IN TOUCH</p>
          <a class="footer-link footer-email" :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="footer-warning">禁止酒駕｜飲酒過量，有害健康｜未滿十八歲禁止飲酒</p>
        <p class="footer-legal">© 2026 WhiskyHello</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  padding: 3rem 1.5rem 1.25rem;
  border-top: 1px solid var(--wh-night-line);
  background: var(--wh-night);
  color: var(--wh-cream);
}

.footer-inner {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
}

.footer-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 2rem 3rem;
  padding-bottom: 2.25rem;
}

.footer-brand,
.footer-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.45rem;
  min-width: 0;
}

.footer-name {
  margin: 0;
  color: var(--wh-cream);
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.01em;
}

.footer-tagline {
  margin: 0;
  color: var(--wh-mauve);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.footer-label {
  margin: 0 0 0.2rem;
  color: var(--wh-gold);
  font-size: var(--fs-eyebrow);
  font-weight: 600;
  letter-spacing: 0.22em;
  line-height: 1.6;
}

.footer-link {
  color: var(--wh-cream);
  font-size: 0.875rem;
  line-height: 1.5;
  text-decoration: none;
  overflow-wrap: anywhere;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: var(--wh-gold-bright);
}

.footer-link:focus-visible {
  outline: 2px solid var(--wh-gold);
  outline-offset: 3px;
  border-radius: 2px;
}

.footer-bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.4rem 1.5rem;
  padding-top: 1.1rem;
  border-top: 1px solid var(--wh-night-line);
}

.footer-warning {
  margin: 0;
  color: #d8cfc4;
  font-size: 0.8125rem;
  letter-spacing: 0.04em;
  line-height: 1.6;
}

.footer-legal {
  margin: 0;
  color: var(--wh-mauve);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .site-footer {
    padding: 2.25rem 1rem 1rem;
  }

  .footer-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.75rem 1.25rem;
    padding-bottom: 1.75rem;
  }

  .footer-brand {
    grid-column: 1 / -1;
  }

  .footer-bottom {
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .footer-link {
    transition: none;
  }
}
</style>
