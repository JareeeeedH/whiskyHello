<script setup lang="ts">
import SiteFooter from '../components/SiteFooter.vue'
import { CONTACT_EMAIL } from '../constants/contact'
</script>

<template>
  <main class="legal-view">
    <article class="legal">
      <h1>使用條款</h1>
      <p class="updated">最後更新：2026 年 10 月 9 日</p>
      <p>歡迎使用 WhiskyHello（威你好）。使用本網站，即表示你同意以下條款。</p>

      <h2>服務內容</h2>
      <p>WhiskyHello 提供威士忌酒款資訊、搜尋、評論分享、AI 侍酒師輔助探索與酒款競標資訊等服務。</p>

      <h2>年齡限制</h2>
      <p>未滿十八歲禁止飲酒，請年滿十八歲再註冊與使用本服務。</p>

      <h2>資訊僅供參考</h2>
      <p>
        酒款資訊、價格與評論可能變動或有誤，請以實際情況為準。部分評分與品飲筆記引用自 WhiskyFun，著作權屬原作者。
      </p>

      <h2>AI 內容</h2>
      <p>AI 產生的內容僅供參考，可能不完整或不正確。</p>

      <h2>使用者評論</h2>
      <p>評論不得違法、侵權或冒充他人，違規內容將直接移除。</p>

      <h2>帳號使用</h2>
      <p>禁止濫用網站與帳號，例如自動化大量存取、建立假帳號、盜用他人帳號或惡意出價，違規者將停用帳號。</p>

      <h2>服務調整</h2>
      <p>我們保留調整、暫停或終止服務，以及修改本條款的權利，更新後公布於本頁。</p>

      <h2>聯絡我們</h2>
      <p>
        對本條款有任何問題，請來信
        <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>。
      </p>
    </article>

    <SiteFooter />
  </main>
</template>

<style scoped>
.legal-view {
  width: 100%;
  background: #fafaf9;
  color: #1c1917;
}

.legal {
  max-width: 760px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 3rem;
  line-height: 1.8;
}

h1 {
  margin: 0 0 0.35rem;
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 3vw, 1.75rem);
  font-weight: 600;
  color: #0f172a;
}

h2 {
  margin: 2rem 0 0.6rem;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
  color: #0f172a;
}

p {
  margin: 0 0 0.85rem;
  color: #44403c;
}

.updated {
  margin-bottom: 1.5rem;
  color: #78716c;
  font-size: 0.875rem;
}

a {
  color: #0f766e;
  text-decoration: none;
  overflow-wrap: anywhere;
}

@media (max-width: 720px) {
  .legal {
    padding: 1.5rem 1rem 2rem;
  }
}
</style>
