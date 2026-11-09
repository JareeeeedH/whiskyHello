# WhiskyHello 🥃

威士忌探索、評論與 AI 推薦平台

## 功能

- **威士忌探索**：搜尋酒款、評論家品飲筆記、AI 翻譯筆記
- **評論**：使用者評論與評分
- **會員**：Email 驗證、Google 登入、忘記密碼、Admin 管理
- **Whisky News**：每週由 GitHub Actions 收集威士忌新聞 RSS，經 LLM 篩選分類後自動更新首頁
- **AI Sommelier**：依口味、酒體、情境、預算推薦兩款；第二款從評論家筆記中以向量搜尋（RAG）挑選

## 技術棧

- **Frontend**：Vue 3、Vite、TypeScript、Vue Router、Pinia、Axios、PrimeVue 4
- **Backend**：Node.js、Express、TypeScript、MongoDB（Mongoose）、JWT、Joi
- **AI**：OpenAI Responses API（Sommelier、翻譯、新聞篩選）、`text-embedding-3-small`（RAG）
- **部署**：Frontend → Vercel（push main 自動部署）；Backend → Railway；DB → MongoDB Atlas；新聞 → GitHub Actions（每週一）

## 架構

```text
Frontend ──REST──▶ Backend ──▶ MongoDB Atlas（User、Review、翻譯快取、RAG 向量）
   │                  └──────▶ OpenAI
   └── Static Whisky Dataset（酒款、評論家筆記，打包在前端）

GitHub Actions（每週）──▶ 新聞 RSS ──▶ OpenAI 篩選 ──▶ 更新 news.ts ──▶ 自動合併 ──▶ Vercel
```

## 文件

| 文件 | 內容 |
|---|---|
| `WHISKYHELLO_SPEC.md` | 總規格 |
| `WHISKYHELLO_AI_SOMMELIER_SPEC.md` | AI Sommelier |
| `WHISKYHELLO_AI_TRANSLATION_SPEC.md` | AI 翻譯 |
| `WHISKY_RAG_SPEC.md` | RAG 口味搜尋 |
| `WHISKYHELLO_NEWS_SPEC.md` | 新聞自動更新 workflow |
| `AGENTS.md` | 開發規則 |
