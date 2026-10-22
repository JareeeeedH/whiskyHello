# WhiskyHello 🥃

威士忌探索、評論與 AI 推薦平台

## 功能

- **威士忌探索**：搜尋酒款、評論家品飲筆記、AI 翻譯筆記
- **評論**：使用者評論與評分
- **會員**：Email 驗證、Google 登入、忘記密碼、Admin 管理
- **Whisky News**
- **AI Sommelier**：依口味、酒體、情境、預算推薦兩款；第二款從評論家筆記中以向量搜尋（RAG）挑選
- **Auction**：Admin 建立與管理競標，會員出價、查看出價紀錄

## 技術棧

- **Frontend**：Vue 3、Vite、TypeScript、Vue Router、Pinia、Axios、PrimeVue 4
- **Backend**：Node.js、Express、TypeScript、MongoDB（Mongoose）、JWT、Joi
- **AI**：OpenAI Responses API（Sommelier、翻譯）、`text-embedding-3-small`（RAG）
- **部署**：Frontend → GitHub Pages（push main 自動部署）；Backend → Railway；DB → MongoDB Atlas

## 架構

```text
Frontend ──REST──▶ Backend ──▶ MongoDB Atlas（User、Review、Auction、Bid、翻譯快取、RAG 向量）
   │                  └──────▶ OpenAI
   └── Static Whisky Dataset（酒款、評論家筆記，打包在前端）
```

- Backend 分層：Route → Validation → Controller → Service → Model
- Frontend 不直接連 MongoDB 或 OpenAI
- 流量限制、Sommelier 每日次數、RAG 向量都存在後端記憶體，只能單一實例

## RAG 建庫（離線）

```bash
cd backend
npm run rag:chunks   # 原始資料 → chunks.jsonl（不呼叫 API）
npm run rag:build    # chunks → embedding → MongoDB whiskynotechunks（未變更的會跳過）
```

## 文件

| 文件 | 內容 |
|---|---|
| `WHISKYHELLO_SPEC.md` | 總規格 |
| `WHISKYHELLO_AI_SOMMELIER_SPEC.md` | AI Sommelier |
| `WHISKYHELLO_AI_TRANSLATION_SPEC.md` | AI 翻譯 |
| `WHISKY_RAG_SPEC.md` | RAG 口味搜尋 |
| `AGENTS.md` | 開發規則 |
