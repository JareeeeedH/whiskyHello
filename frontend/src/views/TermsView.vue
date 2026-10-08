<script setup lang="ts">
import { RouterLink } from 'vue-router'
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
      <p>
        WhiskyHello 提供威士忌酒款資訊、搜尋、評論分享、AI 侍酒師輔助探索，以及酒款競標資訊等服務。
      </p>

      <h2>年齡限制</h2>
      <p>未滿十八歲禁止飲酒。請在年滿十八歲後，再註冊帳號、發布評論或參與競標。</p>

      <h2>資訊僅供參考</h2>
      <p>
        酒款資訊、評分、價格、競標狀態與評論都可能隨時變動或有誤，請以實際情況為準。部分酒款評分與品飲筆記引用自 WhiskyFun，著作權屬原作者所有。
      </p>

      <h2>AI 內容</h2>
      <p>侍酒師建議、品飲筆記翻譯等 AI 產生的內容僅供參考，可能不完整或不正確，不構成專業建議。</p>

      <h2>使用者評論</h2>
      <p>你須對自己發布的內容負責，評論內容不得：</p>
      <ul>
        <li>違反法律，或包含不實、騷擾、歧視等內容。</li>
        <li>侵害他人的著作權、隱私或名譽等權利。</li>
        <li>冒充他人或其他品牌、單位。</li>
        <li>刊登廣告或重複洗版。</li>
      </ul>
      <p>違反規範的內容，我們可以不經通知直接移除。</p>

      <h2>帳號與使用規範</h2>
      <p>請妥善保管你的帳號與密碼。使用本網站時，禁止：</p>
      <ul>
        <li>以程式或自動化工具大量存取、干擾或破壞網站運作。</li>
        <li>建立假帳號、盜用他人帳號，或將帳號提供他人使用。</li>
        <li>惡意出價或以其他方式濫用網站功能。</li>
      </ul>
      <p>違反規範時，我們可以暫停或停用相關帳號。</p>

      <h2>服務調整</h2>
      <p>
        我們保留隨時調整、暫停或終止部分或全部服務，以及修改本條款的權利。條款更新後會公布於本頁，並修改最後更新日期。
      </p>

      <h2>隱私權</h2>
      <p>
        我們如何處理你的個人資料，請參閱<RouterLink to="/privacy">隱私權政策</RouterLink>。
      </p>

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
