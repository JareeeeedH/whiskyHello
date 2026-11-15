# WhiskyHello 威你好 🥃

繁體中文的威士忌探索平台：瀏覽一萬多支酒款的評論家品飲筆記、AI 翻譯、使用者評論，以及用一句話找酒的 AI 侍酒師。

網站：<https://whiskyhello.com>

---

## 功能

| 功能 | 說明 |
|---|---|
| 酒款探索 | 14,555 支酒款（原始 17,346 筆清洗後保留），每支一頁，含評論家筆記與分數 |
| AI 筆記翻譯 | 英文品飲筆記按需翻成繁體中文，結果快取在資料庫 |
| AI 侍酒師 | 用一段話描述想喝的，從評論家筆記推薦 3 款並說明理由；可連續追問 |
| 使用者評論 | 登入後評分、評論 |
| 會員 | Email 驗證碼註冊、Google 登入、忘記密碼、個人頁 |
| 後台 | 使用者、評論、侍酒師查詢紀錄（Admin） |
| 新聞 | 每週由 GitHub Actions 抓 RSS，經 LLM 篩選分類後自動更新 |
| 專欄 | 威士忌知識文章（由獨立專案agent寫手產生文章。） |
| SEO | 每頁標題、描述、canonical、OG；建置時產生 sitemap（約 1.4 萬個網址） |

## AI 侍酒師流程

```text
使用者的一段話
 → ① LLM：判斷意圖＋改寫成英文品飲筆記口吻
    └ 不是找酒（打招呼、知識問答、其他酒類）→ 固定提示，結束
 → ② OpenAI embedding → MongoDB Atlas Vector Search 前 30 → 同款去重
 → ③ cross-encoder rerank 取前 3（Transformers.js，在後端執行）
 → ④ LLM：依每支酒的筆記寫中文推薦卡（酒名一律用資料庫的）
```

- 驗收：20 題風味題 rerank 後 87% 符合需求；25 題真實輸入意圖判斷 25/25
- 每次請求記錄完整過程（不記身分），供分析與改進
- 使用限制：未登入每天 2 次、會員 20 次、全站 300 次；非找酒不扣次數

## 技術棧

| 層 | 技術 |
|---|---|
| Frontend | Vue 3、Vite、TypeScript、Vue Router、Pinia、Axios、PrimeVue 4 |
| Backend | Node.js（≥ 20）、Express 5、TypeScript、Mongoose、JWT、Joi |
| 資料庫 | MongoDB Atlas（使用者、評論、翻譯快取、RAG 向量、查詢紀錄） |
| AI | OpenAI Responses API（侍酒師、翻譯、新聞篩選）、`text-embedding-3-small`、Atlas Vector Search、`@huggingface/transformers`（`ms-marco-MiniLM-L-6-v2` rerank） |
| 部署 | Frontend → Vercel；Backend → Railway；新聞 → GitHub Actions |

## 架構

```text
Frontend（Vercel）──REST──▶ Backend（Railway）──▶ MongoDB Atlas
   │                              └──────────▶ OpenAI
   └── 酒款資料（靜態 JSON，建置時清洗、分檔，打包在前端）

GitHub Actions（每週）──▶ 新聞 RSS ──▶ OpenAI 篩選 ──▶ 更新 news.ts ──▶ 自動部署
```

Backend 分層：Route → Validation → Controller → Service → Model。前端不直接存取資料庫。

## 專案結構

```text
frontend/
  src/views/          頁面（首頁、酒款、侍酒師、專欄、會員、後台）
  src/components/     元件
  src/data/raw/       原始酒款資料（whiskyDataset.json）
  src/utils/          清洗（whiskyClean）、筆記解析、SEO meta 等
  scripts/            建置前清洗並分檔酒款資料
backend/
  src/routes|validations|controllers|services|models/
  scripts/rag/        建庫、評測腳本
  scripts/news/       新聞抓取
```
## 文件

| 文件 | 內容 |
|---|---|
| `WHISKYHELLO_SPEC.md` | 總規格 |
| `WHISKYHELLO_AI_SOMMELIER_SPEC.md` | AI 侍酒師（流程、API、前端、查詢紀錄） |
| `WHISKY_RAG_SPEC.md` | RAG 建庫、搜尋、rerank、測試紀錄與問題追蹤 |
| `WHISKYHELLO_AI_TRANSLATION_SPEC.md` | AI 翻譯 |
| `WHISKYHELLO_NEWS_SPEC.md` | 新聞自動更新 |
| `WHISKYHELLO_COLUMN_SPEC.md` | 專欄 |
| `AGENTS.md` | 開發規則 |

## 資料來源

酒款品飲筆記來自 WhiskyFun，著作權屬原作者；站內引用時標示出處。
