# WhiskyHello 🥃

威士忌探索、評論與 AI 推薦平台（原 WhiskyFun 重構版）。

## 功能與進度

| 範圍 | 功能 | 狀態 |
|---|---|---|
| Phase 1 | 威士忌搜尋、評論家品飲筆記 | ✅ |
| | 使用者評論、評分 | ✅ |
| | 會員（Email 驗證、Google 登入、忘記密碼、Admin） | ✅ |
| | Whisky News | ✅ 靜態資料 |
| Phase 2 | AI Sommelier：第一款 LLM 推薦，第二款從評論家筆記（RAG）挑選 | ✅ |
| | 品飲筆記 AI 翻譯 | ✅ |
| | 口味搜尋（RAG）：建庫、向量比對 | ✅ |
| | 口味搜尋：API、前端頁面 | 未做 |
| Phase 3 | Auction MVP：建立、生命週期、列表、詳情、出價 | ✅ |
| | 倒數、得標者、交易媒合 | 未做 |

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

## 本機開發

```bash
# Backend（http://localhost:3000）
cd backend && cp .env.example .env && npm install && npm run dev

# Frontend（http://localhost:5173）
cd frontend && cp .env.example .env && npm install && npm run dev
```

環境變數（值不進 git）：

- **Backend**：`MONGODB_URI`、`JWT_SECRET`、`CORS_ORIGIN`、`OPENAI_API_KEY`、`OPENAI_MODEL`、`GOOGLE_CLIENT_ID`、`RESEND_API_KEY` 或 `SMTP_USER`／`SMTP_PASS`、`TRUST_PROXY`（Railway 設 `1`）、`TEST_MONGODB_URI`（測試用，名稱需含 `test`）
- **Frontend**：`VITE_API_BASE_URL`、`VITE_GOOGLE_CLIENT_ID`

## 測試

```bash
cd frontend && npm test
cd backend && npm test   # 整合測試需要 TEST_MONGODB_URI 指向可連線的測試資料庫
```

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
