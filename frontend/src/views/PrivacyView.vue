<script setup lang="ts">
import SiteFooter from '../components/SiteFooter.vue'
import { CONTACT_EMAIL } from '../constants/contact'
</script>

<template>
  <main class="legal-view">
    <article class="legal">
      <h1>隱私權政策</h1>
      <p class="updated">最後更新：2026 年 10 月 9 日</p>
      <p>
        WhiskyHello（威你好）重視你的隱私。這份說明會告訴你，我們蒐集哪些資料、如何使用，以及你可以怎麼管理自己的資料。
      </p>

      <h2>我們蒐集的資料</h2>
      <ul>
        <li>帳號資料：暱稱、Email，以及經加密處理的密碼（不保存密碼原文）。</li>
        <li>你發布的內容：酒款評論、評分，以及參與競標時的出價紀錄。</li>
      </ul>

      <h2>使用目的</h2>
      <ul>
        <li>建立與管理帳號、登入驗證，以及寄送 Email 驗證碼與重設密碼信。</li>
        <li>顯示你的評論與出價（只公開暱稱，不公開 Email）。</li>
        <li>提供侍酒師、品飲筆記翻譯等服務功能。</li>
        <li>維護網站安全、防止濫用。</li>
      </ul>
      <p>我們不會出售你的個人資料，也不會將資料用於廣告投放。</p>

      <h2>第三方服務</h2>
      <p>為了提供服務，我們會使用以下第三方服務，它們只會取得完成該功能所需的資料：</p>
      <ul>
        <li>Google：Google 帳號登入。</li>
        <li>Resend：寄送 Email 驗證碼與重設密碼信。</li>
        <li>OpenAI：分析你在侍酒師輸入的口味描述，以及翻譯酒款品飲筆記。</li>
      </ul>

      <h2>你的權利</h2>
      <p>你可以隨時來信，要求查詢、更正或刪除你的帳號與個人資料。</p>

      <h2>聯絡我們</h2>
      <p>
        對本政策有任何問題，請來信
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

p,
ul {
  margin: 0 0 0.85rem;
  color: #44403c;
}

ul {
  padding-left: 1.25rem;
}

li + li {
  margin-top: 0.35rem;
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
