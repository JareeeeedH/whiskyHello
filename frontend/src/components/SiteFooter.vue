<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { CONTACT_EMAIL as contactEmail } from '../constants/contact'
</script>

<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-main">
        <div class="footer-brand">
          <p class="footer-name">WhiskyHello</p>
          <p class="footer-tagline">From one dram to the next.</p>
        </div>
        <div class="footer-contact">
          <p class="footer-label">GET IN TOUCH</p>
          <a class="footer-email" :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
        </div>
      </div>
      <p class="footer-warning">禁止酒駕｜飲酒過量，有害健康｜未滿十八歲禁止飲酒</p>
      <div class="footer-bottom">
        <p class="footer-legal">© 2026 WhiskyHello</p>
        <nav class="footer-links" aria-label="法律資訊">
          <RouterLink to="/privacy">隱私權政策</RouterLink>
          <RouterLink to="/terms">使用條款</RouterLink>
        </nav>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  padding: 1.75rem 1.5rem 1.1rem;
  background: #161311;
  color: var(--wh-paper);
}

.footer-inner {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
}

.footer-main {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.25rem 2rem;
  padding-bottom: 1.1rem;
  border-bottom: 1px solid rgba(250, 250, 249, 0.08);
}

.footer-brand,
.footer-contact {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.footer-contact {
  align-items: flex-end;
  text-align: right;
}

.footer-name {
  margin: 0;
  color: var(--wh-paper);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.01em;
}

.footer-tagline {
  margin: 0;
  color: var(--wh-faint);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.footer-label {
  margin: 0;
  color: var(--wh-gold);
  font-size: var(--fs-eyebrow);
  font-weight: 600;
  letter-spacing: 0.2em;
  line-height: 1.6;
}

.footer-email {
  color: #e7e5e4;
  font-size: 0.875rem;
  line-height: 1.5;
  text-decoration: none;
  overflow-wrap: anywhere;
  transition: color 0.2s ease;
}

.footer-email:hover {
  color: #e0a84a;
}

.footer-email:focus-visible {
  outline: 2px solid #e0a84a;
  outline-offset: 3px;
  border-radius: 2px;
}

.footer-warning {
  margin: 0;
  padding-top: 0.85rem;
  color: #d6d3d1;
  font-size: 0.8125rem;
  letter-spacing: 0.04em;
  line-height: 1.6;
}

.footer-bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.35rem 1.25rem;
  padding-top: 0.5rem;
}

.footer-legal {
  margin: 0;
  color: var(--wh-muted);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  line-height: 1.5;
}

.footer-links {
  display: flex;
  gap: 1.25rem;
}

.footer-links a {
  color: var(--wh-muted);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  line-height: 1.5;
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-links a:hover {
  color: #e0a84a;
}

.footer-links a:focus-visible {
  outline: 2px solid #e0a84a;
  outline-offset: 3px;
  border-radius: 2px;
}

@media (max-width: 640px) {
  .site-footer {
    padding: 1.6rem 1rem 1rem;
  }

  .footer-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.1rem;
    padding-bottom: 1rem;
  }

  .footer-contact {
    align-items: flex-start;
    text-align: left;
  }

  .footer-warning {
    padding-top: 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .footer-email,
  .footer-links a {
    transition: none;
  }
}
</style>
