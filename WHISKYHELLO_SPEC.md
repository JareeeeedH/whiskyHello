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

產品範圍分為 Phase 1 基礎產品、Phase 2 AI Whisky Sommelier、Phase 3 Whisky Auction／酒款競標與交易媒合。

Phase 編號代表產品範圍，不代表開發先後。目前開發順序為：

**Phase 1 基礎產品 → Phase 3 Auction MVP → Phase 2 AI Whisky Sommelier**

Auction 屬於 Phase 3，不屬於 Phase 2。

核心發展方向：

**探索威士忌 → 建立使用者資料 → 個人化 → AI → 未來交易媒合**

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


### Phase 3｜Whisky Auction / 交易媒合

7. **Whisky Auction / 酒款競標與交易媒合**

已實作（Auction MVP）：

- Auction Schema（含 `statusHistory`）
- Auction Lifecycle（`draft` → `scheduled` → `active` → `ended`；Admin Cancel → `cancelled`）
- Admin 管理 API（列表、建立、編輯 draft、Start、Cancel）
- Admin 管理 UI（`/admin/auctions`）
- Lifecycle Job（`scheduled` → `active`、`active` → `ended`）
- Public Auction List API／頁面（`/auctions`：進行中的競標、即將開始）
- Public Auction Detail API／頁面（`/auctions/:id`）
- Bid Schema／API、會員出價 UI、目前最高價與 Bid History 顯示

尚未實作：

- Countdown
- Winner
- Transaction／Matching

詳細規格見第 12 節。

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
├── src/
│   ├── config/
│   ├── controllers/
│   ├── jobs/
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
- Auction（Phase 3，Schema 見第 12 節）
- Bid（Phase 3，Schema 見第 12 節）

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

目前正式定義的 API 為 Auth、Review、Admin、Auction／Bid（公開）。

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
GET    /api/v1/admin/auctions
POST   /api/v1/admin/auctions
PATCH  /api/v1/admin/auctions/:id
POST   /api/v1/admin/auctions/:id/start
POST   /api/v1/admin/auctions/:id/cancel
DELETE /api/v1/admin/auctions/:id
```

- `GET /api/v1/admin/users`：唯讀使用者列表（名稱、Email、頭像、角色、加入日期），不回傳密碼或 Google ID
- Admin Auction API 規格見第 12 節

### Auction／Bid（公開）

```http
GET    /api/v1/auctions
GET    /api/v1/auctions/:id
GET    /api/v1/auctions/:id/bids
POST   /api/v1/auctions/:id/bids
```

- 規格見第 12 節

### Authorization

- Register / Login / Google Login：公開
- `GET /api/v1/auth/me`：需要 JWT
- 建立 Review：需要 JWT
- 修改 Review：需要 JWT，且只能修改自己的 Review
- 刪除 Review：需要 JWT，且只能刪除自己的 Review
- `GET /api/v1/me/reviews`：需要 JWT
- `GET /api/v1/auctions`、`GET /api/v1/auctions/:id`、`GET /api/v1/auctions/:id/bids`：公開
- `POST /api/v1/auctions/:id/bids`：需要 JWT
- `/api/v1/admin/*`：需要 JWT，且 `role` 為 `admin`（Admin RBAC）
  - 未登入回傳 401，非 admin 回傳 403
  - 每次請求都從資料庫讀取最新 `role`

### Admin Frontend Routes

```text
/admin           Admin 首頁
/admin/users     User Management（唯讀）
/admin/auctions  Auction Management
```

以上路由需登入且 `role` 為 `admin`，非 admin 導回首頁。

### Auction Frontend Routes

```text
/auctions        Public Auction List（進行中的競標、即將開始）
/auctions/:id    Public Auction Detail（出價需登入）
```

以上路由公開，不需登入即可瀏覽。


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

---

## 12. Phase 3｜Whisky Auction / 酒款競標與交易媒合

目標不是立即建立完整電商交易平台。目前已確認的產品概念：

- Admin 在 Admin Page 建立競標產品
- Admin 可啟動競標
- 啟動後提供獨立競標頁面
- 競標頁顯示酒款／產品資訊
- 顯示起標價
- 顯示目前最高價格
- 顯示競標倒數
- 顯示投標價格明細
- 會員可參與投標
- 競標結束後產生後續交易／媒合流程

### 12.1 已實作｜Auction MVP

#### Auction Schema

```text
Auction
├── _id
├── whiskyId
├── createdBy
├── title
├── description
├── startingPrice
├── startAt
├── endAt
├── status
├── statusHistory[]
│   ├── status
│   ├── message
│   ├── changedBy
│   └── changedAt
├── createdAt
└── updatedAt
```

| 欄位 | 說明 |
|---|---|
| `_id` | Auction 唯一 ID |
| `whiskyId` | String，對應 Static Dataset 的 `Whisky.id`，必填 |
| `createdBy` | ObjectId，對應 `User._id`（建立的 Admin），必填 |
| `title` | 競標標題，必填 |
| `description` | 說明，選填 |
| `startingPrice` | 起標價，必填，>= 0 |
| `startAt` | Auction 正式開始、開放接受出價的時間，必填，由 Admin 建立時設定 |
| `endAt` | Auction 停止接受出價的時間，必填，必須嚴格晚於 `startAt` |
| `status` | `draft` / `scheduled` / `active` / `ended` / `cancelled`，必填 |
| `statusHistory` | Admin 手動狀態變更紀錄（陣列，預設空陣列）；目前只有 Cancel 會寫入 |
| `statusHistory[].status` | 此次變更後的狀態 |
| `statusHistory[].message` | Admin 此次狀態變更訊息，必填，最多 500 字 |
| `statusHistory[].changedBy` | ObjectId，對應 `User._id`（執行變更的 Admin） |
| `statusHistory[].changedAt` | Date，變更時間 |
| `createdAt` | 建立時間 |
| `updatedAt` | 修改時間 |

#### Status 定義

| Status | 定義 | 前台 | 出價 |
|---|---|---|---|
| `draft` | Admin 建立後的初始狀態；可編輯、可 Start | 不公開（List 不顯示，Detail／Bid History 回傳 404） | 不可 |
| `scheduled` | Admin 已 Start，`startAt` 尚未到達 | List「即將開始」；可看 Detail | 不可 |
| `active` | `startAt` 已到達；`endAt` 到達後轉為 `ended` | List「進行中的競標」；可看 Detail | 可以 |
| `ended` | `endAt` 已到達 | List「已結束」（有出價顯示「有成交」與最高出價；無出價顯示「無人出價」與起標價）；可看 Detail | 不可 |
| `cancelled` | Admin 手動取消，保留取消訊息紀錄 | List 不顯示；Detail 維持既有行為（非 `draft` 皆可查看） | 不可 |

#### startAt／endAt

- `startAt`：Auction 正式開始、開放接受出價的時間
- `endAt`：Auction 停止接受出價的時間；可因延長結標而延後（見 Bid 規則）
- `endAt` 必須嚴格晚於 `startAt`：建立、編輯（含只修改其中一個欄位，與既有值比較）與 Start 時皆檢查，違反時回傳 400

#### 已確認規則

- 建立 Auction 時 `status` 固定為 `draft`，不接受用戶端傳入 `status`、`createdBy` 或 `statusHistory`
- `startAt` 由 Admin 建立時設定
- 只有 `draft` 可以編輯；可編輯欄位為 `whiskyId`、`title`、`description`、`startingPrice`、`startAt`、`endAt`
- 只有 `draft` 可以 Start；Start 前需通過 Auction Schema 驗證
- `scheduled` / `active` / `ended` / `cancelled` 不可編輯，也不可 Start
- 只有 `draft`、`scheduled`、`active` 可以 Cancel；`ended`、`cancelled` 不可再取消

#### Admin Start

Admin 對 `draft` 執行 Start，依目前時間（`now`）決定結果：

| 條件 | 結果 |
|---|---|
| `now < startAt` | `draft` → `scheduled` |
| `startAt <= now < endAt` | `draft` → `active` |
| `now >= endAt` | 不允許 Start，回傳 400，維持 `draft` |

#### Admin Cancel

- Admin 可將 `draft`、`scheduled`、`active` 調整為 `cancelled`
- 必須輸入狀態變更訊息（`message`）
- 取消時不只覆蓋 `status`，同時在 `statusHistory` 新增一筆 `{ status: 'cancelled', message, changedBy, changedAt }`
- 以「目前狀態仍可取消」為條件的單次更新寫入，避免與 Lifecycle Job 同時更新時覆蓋對方
- 已存在的 Bid 保留，不刪除

#### Admin Delete

- Admin 可刪除任何狀態（`draft`、`scheduled`、`active`、`ended`、`cancelled`）的 Auction
- 永久刪除，無法復原；同時刪除該 Auction 的所有 Bid

#### 狀態流程

```text
draft
  ↓ Admin Start（now < startAt）
scheduled
  ↓ startAt 到達（Lifecycle Job）
active
  ↓ endAt 到達（Lifecycle Job）
ended
```

- Admin Start 時若 `startAt <= now < endAt`，直接 `draft` → `active`
- `draft`、`scheduled`、`active` 皆可由 Admin Cancel → `cancelled`
- `ended`、`cancelled` 為最終狀態

#### Lifecycle Job（Auto Close）

同一個 Job 依序處理（共用同一個 `now`）：

1. `status = scheduled` 且 `now >= startAt` → `active`
2. `status = active` 且 `now >= endAt` → `ended`

- `draft`、`ended`、`cancelled` 不處理；已轉換者不重複處理
- 同一次執行中，`startAt` 與 `endAt` 都已過的 `scheduled` 會先轉 `active` 再轉 `ended`
- 執行機制：Backend 啟動且成功連上 MongoDB 後，以 Node 內建 `setInterval` 每 60 秒執行一次（啟動時先執行一次）；未連上 MongoDB 時不啟動；同一時間只執行一次；不建立第二套 timer
- 狀態轉換最多延遲一個執行間隔；Backend 未執行時不會轉換，下次啟動時補處理
- 不處理 Winner／得標，不新增 `winnerId`

#### Admin Auction API

所有 API 需要 JWT 且 `role` 為 `admin`（見第 9 節 Authorization）。

```http
GET    /api/v1/admin/auctions              Auction 列表，依建立時間新到舊
POST   /api/v1/admin/auctions              建立 Auction（status = draft）
PATCH  /api/v1/admin/auctions/:id          編輯 draft Auction
POST   /api/v1/admin/auctions/:id/start    Start draft（→ scheduled 或 active）
POST   /api/v1/admin/auctions/:id/cancel   取消 Auction（→ cancelled）
DELETE /api/v1/admin/auctions/:id          永久刪除 Auction 及其所有 Bid
```

- 建立：`whiskyId`、`title`、`startingPrice`、`startAt`、`endAt` 必填，`description` 選填
- 編輯：至少一個可編輯欄位
- 編輯或 Start 非 `draft` 的 Auction：回傳 400
- `endAt` 未晚於 `startAt`：回傳 400
- Start 時已到達 `endAt`：回傳 400
- Cancel：Request `{ "message": string }`（必填，去除前後空白後不可為空，最多 500 字）；Response 200 `{ "auction": ... }`
- Cancel `ended` / `cancelled`：回傳 400
- Delete：任何狀態皆可；Response 204（無 body）
- Auction 不存在：回傳 404
- Admin API 回傳的 Auction 包含 `createdBy` 與 `statusHistory`

#### Admin Auction Management UI

路由：`/admin/auctions`（需登入且為 admin，入口在 `/admin`）

- 顯示 Auction 列表；上方可依狀態篩選（All 與各狀態，顯示數量），列表不顯示描述（編輯時查看）
- 建立 Auction
- `draft` 顯示 Edit / Start / Cancel Auction
- `scheduled`、`active` 顯示 Cancel Auction；`ended`、`cancelled` 不顯示 Cancel
- 所有狀態皆顯示 Delete；刪除前需確認，成功後從列表移除
- Cancel 前需在對話框輸入狀態變更訊息，成功後列表顯示 `cancelled`
- 有 `statusHistory` 時顯示最後一次狀態變更（狀態、時間、訊息）
- 建立與編輯欄位：`whiskyId`、`title`、`description`、`startingPrice`、`startAt`、`endAt`

#### Public Auction API

```http
GET /api/v1/auctions       Public Auction List（公開）
GET /api/v1/auctions/:id   Public Auction Detail（公開）
```

Public Auction List：

- Response 200：`{ "auctions": PublicAuctionDetail[] }`
- 回傳 `endAt > now` 的 `active` 與 `scheduled`，以及全部 `ended`
- `draft`、`cancelled` 不回傳
- 排序：先 `active`（依 `endAt` 早到晚），再 `scheduled`（依 `startAt` 早到晚），最後 `ended`（依 `endAt` 新到舊）
- 前台依 `status` 分組

Public Auction Detail：

- Response 200：`{ "auction": PublicAuctionDetail }`
- `scheduled`、`active`、`ended`、`cancelled` 可查看
- `draft` 或不存在：404；id 格式錯誤：400

`PublicAuctionDetail`：`id`、`whiskyId`、`title`、`description`、`startingPrice`、`startAt`、`endAt`、`status`、`createdAt`、`updatedAt`。不回傳 `createdBy` 與 `statusHistory`。

#### Public Auction UI

`/auctions`（公開）：

- 固定顯示兩區：「進行中的競標」（`active`）、「即將開始」（`scheduled`）
- 兩區各自顯示 empty state；另有 loading 與可重試的 error state
- 卡片顯示：酒款圖片與名稱、標題、狀態、價格、開始時間、結束時間、進入 Detail 的連結
- `active` 卡片價格為目前價格（逐筆呼叫 Bid History 取得 `currentPrice`，失敗時改顯示起標價）
- `scheduled` 卡片顯示起標價（尚無出價，不呼叫 Bid History），不顯示出價操作，可進入 Detail

`/auctions/:id`（公開）：

- 顯示狀態、標題、酒款、起標價、開始／結束時間、目前價格、Bid History、說明
- `active`：登入後可出價；未登入顯示登入連結
- `scheduled`：目前價格 = 起標價，顯示開放出價時間，不提供出價操作
- 其他狀態：不提供出價操作

#### Bid Schema

```text
Bid
├── _id
├── auctionId
├── userId
├── amount
├── createdAt
└── updatedAt
```

| 欄位 | 說明 |
|---|---|
| `_id` | Bid 唯一 ID |
| `auctionId` | ObjectId，對應 `Auction._id`，必填 |
| `userId` | ObjectId，對應 `User._id`（出價者），必填 |
| `amount` | 出價金額，必填，整數，>= 0 |
| `createdAt` | 出價時間 |
| `updatedAt` | 修改時間 |

#### Bid 規則

- 必須登入才能出價
- 只有 `active` 的 Auction 可以出價（`scheduled`、`ended`、`cancelled` 皆不可）
- 目前時間到達 `endAt`（含）後禁止新出價（即使 Lifecycle Job 尚未將狀態轉為 `ended`）
- 第一筆出價：最低出價 = `startingPrice`
- 後續出價：必須 >= 目前最高出價 + 100（同價或低於最低加價皆不允許）
- 同一 Auction 的相同出價金額不得重複建立，透過 MongoDB unique compound index (auctionId, amount) 保證
- 延長結標：距離 `endAt` 1 分鐘內（含）成功出價時，`endAt` 改為「出價時間 + 2 分鐘」；不限延長次數，只會延後不會提前
- 目前最高出價（`currentPrice`）由 Bid 資料計算，不寫入 Auction Schema
- 沒有任何 Bid 時，`currentPrice = startingPrice`
- 出價時不另外檢查 `startAt`：只有 Start 或 Lifecycle Job 在 `now >= startAt` 時才會將狀態設為 `active`
- 不限制建立者、Admin 出價或同一會員連續出價
- 不處理 Winner，不新增 `winnerId`

#### Bid API

```http
POST /api/v1/auctions/:id/bids   建立出價（需要 JWT）
GET  /api/v1/auctions/:id/bids   取得 Bid History（公開）
```

建立出價：

- Request：`{ "amount": number }`（整數）
- Response 201：`{ "bid": PublicBid, "currentPrice": number, "endAt": string }`（`endAt` 為出價後最新的結標時間）
- Auction id 格式錯誤、`amount` 驗證失敗：400
- Auction 不存在或為 `draft`：404
- Auction 非 `active`：400
- 已到達 `endAt`：400
- 低於最低出價：400
- 同一 Auction 相同金額已被其他出價搶先建立：400，`{ "message": "此價格已被其他競標者搶先出價，請重新出價。" }`

取得 Bid History：

- Response 200：`{ "bids": PublicBid[], "currentPrice": number }`
- 依出價時間新到舊排列
- Auction 不存在或為 `draft`：404；其他狀態皆可取得

`PublicBid`：`id`、`auctionId`、`userId`、`bidderName`、`amount`、`createdAt`、`updatedAt`。只帶出 User 的 `name`，不回傳 `email`、`passwordHash` 等其他 User 欄位。

### 12.2 尚未實作

- Countdown
- Winner
- Transaction／Matching

### 12.3 尚未決定

以下細節尚未討論，不在本規格定義，留待後續 Feature 規格討論：

- 結標規則（延長結標除外，見 Bid 規則）
- 得標規則
- 即時更新
- 完整交易流程
- `whiskyId` 是否需驗證存在於 Static Dataset
- Cancel 以外的 Admin 狀態變更是否也寫入 `statusHistory`

### 12.4 目前暫不處理

以下項目不列入目前開發範圍：

- 付款／金流、Escrow、物流
- 競標相關的權限、異常與競態處理
- 台灣酒類販售／轉讓及相關平台責任的合規確認

---

## 13. Phase 1 的非目標（Non-Goals）

為避免專案過度擴張，Phase 1 明確不做：

- AI Whisky Sommelier
- 完整 AI Agent 系統
- Whisky Auction／酒款競標與交易媒合（屬 Phase 3，不在 Phase 1 範圍；Auction MVP 見第 12 節）
- Bid（Phase 3，見第 12.1 節）；結標／得標規則、即時更新、完整交易流程（尚未決定，見第 12.3 節）
- 付款／金流、Escrow、物流（目前暫不處理，見第 12.4 節）
- Whisky MongoDB Master Data
- Collection System
- 獨立 TasteProfile Model
- 獨立 TastingRecord Model
- News MongoDB

---

## 14. 開發原則

1. **先理解現況，再重構。**
2. **不要為了新技術而換技術。**
3. **優先保留真正有價值的既有資料與功能。**
4. **Frontend 不直接處理 MongoDB。**
5. **Raw Static Dataset 保留原始版本。**
6. **Whisky Data 必須經過標準化後再提供給 UI。**
7. **API Key、JWT Secret、Database URI 等敏感資訊不得寫入程式碼或 Git。**
8. **依第 16 節開發順序推進：Phase 1 基礎產品 → Phase 3 Auction MVP → Phase 2 AI Whisky Sommelier。**
9. **Cursor / AI 產生的程式碼必須由人員 Review、測試與驗證。**
10. **不進行沒有明確產品價值的過度工程化。**

---

## 15. 目前專案基準版本

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
Auction = MongoDB（Phase 3）
Bid = MongoDB（Phase 3）
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

## 16. 開發順序建議

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
11. Phase 3 Auction MVP（Auction Schema、Lifecycle、Admin 管理 API／UI、Public Auction List／Detail、Bid API／UI、Lifecycle Job）
12. Phase 2 AI Whisky Sommelier
```

目前開發順序：**Phase 1 基礎產品 → Phase 3 Auction MVP → Phase 2 AI Whisky Sommelier**。Auction 屬於 Phase 3，不計入 Phase 2。

Phase 3 後續功能（結標、得標、交易等）需先確認第 12.3 節規則，再另開 Feature 規格；排入時程尚未決定。

---

## 17. 文件狀態

本規格為目前 WhiskyHello v2 的**基準規格（Baseline）**。

任何新增功能、技術變更或 Schema 變更，在開始實作前應先更新本規格並確認變更理由。
