# WhiskyHello v2 規格書

> 專案名稱：WhiskyHello
> 
> 舊版名稱：WhiskyFun
> 
> 文件版本：v1.0
> 
> 文件狀態：目前定案版（Baseline）

---

## 1. 專案目標

WhiskyHello 是一個以威士忌探索、評論與個人化體驗為核心的產品。

產品範圍分為 Phase 1 基礎產品、Phase 2 AI Whisky Sommelier。

核心發展方向：

**探索威士忌 → 建立使用者資料 → 個人化 → AI**

---

## 2. Product Scope

### Phase 1｜基礎產品

1. **威士忌搜尋／知名評論家評論**
2. **使用者評論／評分**
3. **會員／個人資料**
4. **Whisky News／最新資訊**

### Phase 2｜AI

6. **AI Whisky Sommelier**
   - 今日喝什麼
   - 根據口味、收藏、預算、當下情境推薦
   - 解釋推薦原因

7. **AI 口味搜尋（RAG）**（建庫完成，搜尋 API 進行中）
   - 在 Whisky 頁以自然語言描述風味，從評論家品飲筆記找出最接近的酒款
   - MVP 只做檢索（語意搜尋），不由 LLM 生成回答
   - 詳細規格見第 11 節與 `WHISKY_RAG_SPEC.md`

---

## 3. Frontend 技術棧

### Core

- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia
- Axios
- PrimeVue 4

### 後續

- Testing
- Tailwind CSS（視 UI 需求決定）

### 前後端工作方式

Frontend 僅透過 REST API 與 Backend 溝通，不直接連接 MongoDB。

Whisky 主資料維持 Static Dataset，透過 Frontend Data Layer 進行資料標準化與使用。

---

## 4. Backend 技術棧

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- JWT
- Joi
- REST API

### 後續

- Backend AI Service（Phase 2）

---

## 5. Backend Architecture

統一採用：

```text
Request
  ↓
Route
  ↓
Validation
  ↓
Controller
  ↓
Service
  ↓
Model
  ↓
MongoDB
```

### 各層責任

- **Route**：API 路徑、HTTP Method、Middleware 串接
- **Validation**：使用 Joi 驗證外部輸入
- **Controller**：處理 Request / Response
- **Service**：Business Logic
- **Model**：Mongoose Schema 與 MongoDB 資料操作
- **Middleware**：JWT、Validation、錯誤處理等共用流程

目前不建立 Repository Layer。

---

## 6. 專案目錄結構

### Root

```text
WhiskyHello/
├── frontend/
└── backend/
```

### Frontend

```text
frontend/
├── src/
│   ├── api/
│   ├── assets/
│   ├── components/
│   ├── composables/
│   ├── layouts/
│   ├── router/
│   ├── services/
│   ├── stores/
│   ├── types/
│   ├── utils/
│   ├── views/
│   ├── App.vue
│   └── main.ts
├── public/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Backend

```text
backend/
├── scripts/        # 離線腳本（Phase 2 RAG 建庫），不在編譯範圍內
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── test/
│   ├── validations/
│   ├── types/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 7. Whisky Static Dataset 規格

Whisky 主資料目前**不進 MongoDB**。

### Raw Dataset

目前已確認的原始資料欄位：

```text
id
NAME
SCORE
NOTE
IMAGE_PATH
```

### Data Processing

原始資料需先經過 Data Processing / Normalization，再供前端使用。

```text
Raw Static Dataset
      ↓
Data Processing / Normalization
      ↓
Standardized Whisky Model
      ↓
Whisky Service
      ↓
Frontend
```

### Standardized Whisky Model

```text
Whisky
├── id
├── name
├── subtitle
├── sgp
├── points
├── score
├── note
└── imageUrl
```

### 欄位轉換概念

- `id` → 保留原始 Whisky ID
- `NAME` → 拆分為 `name` / `subtitle`
- `SCORE` → 整理為 `sgp` / `points`，並保留標準化後的 `score`
- `NOTE` → `note`
- `IMAGE_PATH` → 組合為 `imageUrl`

### 重要規則

`whiskyId` 是 Review 與 Static Whisky Data 之間的關聯鍵，必須保持穩定，不可任意重新編號。

---

## 8. MongoDB Data Model

目前 MongoDB 的 Model：

- User（Phase 1）
- Review（Phase 1）
- WhiskyNoteChunk（Phase 2，Schema 見 `WHISKY_RAG_SPEC.md` 第 4 節）

### User Schema

```text
User
├── _id
├── name
├── email
├── passwordHash
├── googleId
├── role
├── avatar
├── bio
├── createdAt
└── updatedAt
```

### User 欄位說明

| 欄位 | 說明 |
|---|---|
| `_id` | MongoDB 唯一 ID |
| `name` | 使用者顯示名稱 |
| `email` | 登入帳號，唯一 |
| `passwordHash` | 雜湊後密碼，不儲存明文密碼；只用 Google 登入的帳號可為空 |
| `googleId` | Google 帳號 ID，選填，唯一 |
| `role` | `user` 或 `admin`，預設 `user` |
| `avatar` | 使用者頭像 |
| `bio` | 個人簡介 |
| `createdAt` | 建立時間 |
| `updatedAt` | 更新時間 |

### User Role 規則

- 註冊與 Google 新帳號一律為 `user`，不接受用戶端傳入 `role`
- 舊資料沒有 `role` 欄位時視為 `user`
- 目前沒有變更角色的 API；`admin` 只能直接在資料庫設定

### Review Schema

```text
Review
├── _id
├── userId
├── whiskyId
├── title
├── content
├── rating
├── nose
├── taste
├── finish
├── createdAt
└── updatedAt
```

### Review 欄位說明

| 欄位 | 說明 |
|---|---|
| `_id` | Review 唯一 ID |
| `userId` | 對應 `User._id` |
| `whiskyId` | 對應 Static Dataset 的 `Whisky.id` |
| `title` | 使用者評論標題 |
| `content` | 使用者評論內容 |
| `rating` | 使用者評分，0～100 |
| `nose` | 香氣描述 |
| `taste` | 口感描述 |
| `finish` | 尾韻描述 |
| `createdAt` | 建立時間 |
| `updatedAt` | 修改時間 |

### Data Relationship

```text
User 1 ───── N Review N ───── 1 Static Whisky
```

知名評論家評論與使用者評論需區分：

- **知名評論家評論**：Static Dataset
- **WhiskyHello 使用者評論**：MongoDB Review

---

## 9. API Specification

目前正式定義的 API 為 Auth、Review、Admin。

### Auth

```http
POST   /api/v1/auth/register
POST   /api/v1/auth/register/verify
POST   /api/v1/auth/register/resend
POST   /api/v1/auth/password/forgot
POST   /api/v1/auth/password/reset
POST   /api/v1/auth/login
POST   /api/v1/auth/google
GET    /api/v1/auth/me
```

### Email Registration Verification

- Email／密碼註冊需先通過 6 位數 Email 驗證碼，驗證成功後才建立 User
- `POST /api/v1/auth/register`：資料先存入 `PendingRegistration`（密碼與驗證碼皆只存雜湊），寄出驗證碼後回傳 202；Email 已是正式會員時回傳 409
- `POST /api/v1/auth/register/verify`：接收 `email`、`code`，正確時建立 `user` 帳號、刪除暫存資料並回傳 JWT（直接登入）；錯誤或過期回傳 400
- `POST /api/v1/auth/register/resend`：重寄驗證碼，舊驗證碼作廢；無論該 Email 是否有待驗證資料都回傳相同訊息
- 驗證碼 10 分鐘有效；同一 Email 寄送間隔至少 90 秒，未滿時回傳 429
- 暫存資料在最後一次寄送 1 小時後自動刪除（MongoDB TTL）
- 同一 Email 尚在暫存中再次註冊時，以新資料覆蓋並重寄驗證碼
- 寄信失敗回傳 503，不儲存暫存資料；前端顯示「驗證信寄送失敗，請稍後再試」
- 驗證碼寄送優先順序：Resend（`RESEND_API_KEY`，寄件人 `MAIL_FROM`，預設 `WhiskyHello <noreply@whiskyhello.com>`，逾時 15 秒）→ Gmail（`SMTP_USER`／`SMTP_PASS` 應用程式密碼）→ 開發環境皆未設定時改印在後端 console
- 正式站（Railway 封鎖對外 SMTP）使用 Resend；本機開發使用 Gmail
- 寄信頻率限制：Register、Resend、Forgot 三個寄信入口共用同一 IP 計數，正式環境每小時 5 次、每天 10 次（非正式環境各 100 次）；超過回傳 429，前端顯示「操作太頻繁，請稍後再試」（同一 Email 90 秒冷卻則顯示「（重寄需間隔 90 秒）」）
- Verify 沿用 Auth 頻率限制
- Google 登入不需 Email 驗證；登入成功時刪除同 Email 的暫存註冊資料

### Forgot Password

- 前端 `/forgot-password`（登入頁「忘記密碼？」進入）：輸入 Email 寄送驗證碼，同頁輸入驗證碼、新密碼、確認新密碼
- `POST /api/v1/auth/password/forgot`：接收 `email`；有密碼的帳號寄出 6 位數驗證碼；Email 未註冊時不寄信但回傳相同訊息；只用 Google 登入（無密碼）的帳號回傳 409，前端顯示「此帳號使用 Google 登入，請直接使用 Google 登入」，不寄信、不設定密碼
- `POST /api/v1/auth/password/reset`：接收 `email`、`code`、`password`（8～128 字元）；正確時更新密碼、清除驗證碼並回傳 JWT（直接登入）；錯誤或過期回傳 400
- 驗證碼存在 User（`passwordResetCodeHash`、`passwordResetCodeExpiresAt`、`passwordResetLastSentAt`、`passwordResetAttempts`，皆不對外回傳），只存雜湊
- 驗證碼 10 分鐘有效、用過即作廢；同一組錯誤 5 次即作廢，需重新寄送
- 寄送間隔至少 90 秒，未滿時回傳 429；寄信失敗回傳 503 且不儲存驗證碼
- Forgot 與註冊共用寄信頻率限制（見上）；Reset 沿用 Auth 頻率限制
- 不寄送「密碼已變更」通知信；重設後既有 JWT 仍在效期內有效

### Google Login

- `POST /api/v1/auth/google` 接收 Google ID Token（`credential`），驗證後回傳 WhiskyHello JWT
- 已綁定該 `googleId` 的帳號直接登入
- 沒有帳號時建立新帳號，`role` 為 `user`
- Email 已被非 Google 帳號使用時回傳 409，不自動合併帳號
- Register／Login／Google Login 有登入頻率限制

### Review

```http
GET    /api/v1/whiskies/:whiskyId/reviews
POST   /api/v1/reviews
PATCH  /api/v1/reviews/:id
DELETE /api/v1/reviews/:id
GET    /api/v1/me/reviews
```

### Admin

```http
GET    /api/v1/admin/users
```

- `GET /api/v1/admin/users`：唯讀使用者列表（名稱、Email、頭像、角色、加入日期），不回傳密碼或 Google ID

### Authorization

- Register / Login / Google Login：公開
- `GET /api/v1/auth/me`：需要 JWT
- 建立 Review：需要 JWT
- 修改 Review：需要 JWT，且只能修改自己的 Review
- 刪除 Review：需要 JWT，且只能刪除自己的 Review
- `GET /api/v1/me/reviews`：需要 JWT
- `/api/v1/admin/*`：需要 JWT，且 `role` 為 `admin`（Admin RBAC）
  - 未登入回傳 401，非 admin 回傳 403
  - 每次請求都從資料庫讀取最新 `role`

### Admin Frontend Routes

```text
/admin           Admin 首頁
/admin/users     User Management（唯讀）
```

以上路由需登入且 `role` 為 `admin`，非 admin 導回首頁。

Whisky評論搜索的主資料亦不建立 MongoDB CRUD API。

---

## 10. News Specification

Whisky News 屬於 Phase 1 的產品功能，但目前不建立 News MongoDB Model。

方向：

```text
External News Sources
      ↓
Backend News Service
      ↓
整理／統一格式
      ↓
Frontend
```

目前只定義資料處理方向，不在本規格中增加新的正式 API Endpoint。

News 的來源、RSS / API / 網站資料方式、更新頻率與內容合法性，於實作時另行確認。

### 自動更新 workflow

每週由 GitHub Actions 收集 RSS、經 LLM 篩選分類後更新 `frontend/src/data/news.ts`，開 PR 並在自動檢查通過後自動合併。來源、選稿標準、數量規則與執行方式見 `WHISKYHELLO_NEWS_SPEC.md`。

---

## 11. Phase 2｜AI Whisky Sommelier

Phase 2 才加入 AI。

核心使用情境：

> **今天喝什麼？**

AI 未來可參考：

- 使用者過去評論
- 評分
- 品飲資料（若最終建立）
- 收藏資料（若未來建立）
- 預算
- 當下情境／心情

輸出：

- 推薦酒款
- 推薦理由
- 與使用者偏好的關聯

### 預期資料流

```text
Frontend
   ↓
Backend API
   ↓
Recommendation Service
   ↓
User Data + Whisky Data
   ↓
AI Service
   ↓
LLM
   ↓
Recommendation
```

Phase 2 才新增 AI 相關 API 與 Service，不在 Phase 1 實作。

### 11.1 AI 口味搜尋（RAG）

狀態：建庫完成（MongoDB 5000 筆），搜尋 API 進行中。完整規格見 `WHISKY_RAG_SPEC.md`。

- 用途：Whisky 頁的口味搜尋；Sommelier 第二款從前 5 名候選中由 LLM 挑選（第一款仍由 LLM 自由推薦，見 `WHISKYHELLO_AI_SOMMELIER_SPEC.md` 4.7）。
- 切塊：一瓶酒一塊，內容為酒名、Nose、Mouth、Finish、Comments。
- Embedding：後端以 OpenAI `text-embedding-3-small`（1536 維）自行產生。
- 範圍：先做前 5000 筆。
- 儲存：MongoDB Atlas 新 collection `whiskynotechunks`，向量存成 `[Number]`；與翻譯快取分開。
- 搜尋：不用 Atlas Vector Search；後端啟動時把向量讀進記憶體，自己算 cosine。中文問題不翻譯，直接 embedding。
- 建庫：`backend/scripts/` 的離線腳本，不在後端編譯範圍內。

```text
【建庫】Static Dataset → 切段落 → 清理 → chunk → OpenAI embedding → MongoDB Atlas
【啟動】Backend 連上 MongoDB → 向量讀進記憶體
【搜尋】Frontend → Backend API → OpenAI embedding → 記憶體 cosine → 酒款與命中摘句
```

---

## 12. Phase 1 的非目標（Non-Goals）

為避免專案過度擴張，Phase 1 明確不做：

- AI Whisky Sommelier
- 完整 AI Agent 系統
- Whisky MongoDB Master Data
- Collection System
- 獨立 TasteProfile Model
- 獨立 TastingRecord Model
- News MongoDB

---

## 13. 開發原則

1. **先理解現況，再重構。**
2. **不要為了新技術而換技術。**
3. **優先保留真正有價值的既有資料與功能。**
4. **Frontend 不直接處理 MongoDB。**
5. **Raw Static Dataset 保留原始版本。**
6. **Whisky Data 必須經過標準化後再提供給 UI。**
7. **API Key、JWT Secret、Database URI 等敏感資訊不得寫入程式碼或 Git。**
8. **依第 15 節開發順序推進：Phase 1 基礎產品 → Phase 2 AI Whisky Sommelier。**
9. **Cursor / AI 產生的程式碼必須由人員 Review、測試與驗證。**
10. **不進行沒有明確產品價值的過度工程化。**

---

## 14. 目前專案基準版本

### Frontend

```text
Vue 3
Vite
TypeScript
Vue Router
Pinia
Axios
PrimeVue 4
```

### Backend

```text
Node.js
Express
TypeScript
MongoDB
Mongoose
JWT
Joi
REST API
```

### Data

```text
Whisky = Static Dataset
User = MongoDB
Review = MongoDB
```

### Architecture

```text
Frontend
  ↓ Axios
REST API
  ↓
Express
  ↓
Route
  ↓
Validation
  ↓
Controller
  ↓
Service
  ↓
Model
  ↓
MongoDB
```

---

## 15. 開發順序建議

```text
1. 建立 Frontend / Backend 專案骨架
2. 建立 Whisky Data Layer
3. 確認 Static Dataset 正常整理與搜尋
4. 建立 User Model
5. 實作 Register / Login / JWT
6. 建立 Review Model
7. 實作 Review API
8. 串接 Frontend Review UI
9. 完成 Phase 1 基礎產品
10. 驗證實際使用流程
11. Phase 2 AI Whisky Sommelier
```

---

## 16. 文件狀態

本規格為目前 WhiskyHello v2 的**基準規格（Baseline）**。

任何新增功能、技術變更或 Schema 變更，在開始實作前應先更新本規格並確認變更理由。
