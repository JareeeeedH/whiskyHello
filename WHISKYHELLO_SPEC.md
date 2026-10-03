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

- Auction Schema
- Admin 管理 API（列表、建立、編輯 draft、Start）
- Admin 管理 UI（`/admin/auctions`）
- Bid Schema／API（建立出價、Bid History、目前最高價計算）

尚未實作：

- Auction Detail（獨立競標頁）
- 會員出價 UI、目前最高價與 Bid History 的前端顯示
- Countdown
- Auto Close
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
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── validations/
│   ├── types/
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
POST   /api/v1/auth/login
POST   /api/v1/auth/google
GET    /api/v1/auth/me
```

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
```

- `GET /api/v1/admin/users`：唯讀使用者列表（名稱、Email、頭像、角色、加入日期），不回傳密碼或 Google ID
- Admin Auction API 規格見第 12 節

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
/admin/auctions  Auction Management
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
| `startAt` | 開始時間，必填，由 Admin 建立時設定 |
| `endAt` | 結束時間，必填 |
| `status` | `draft` / `scheduled` / `active` / `ended` / `cancelled`，必填 |
| `createdAt` | 建立時間 |
| `updatedAt` | 修改時間 |

#### 已確認規則

- 建立 Auction 時 `status` 固定為 `draft`，不接受用戶端傳入 `status` 或 `createdBy`
- `startAt` 由 Admin 建立時設定
- 只有 `draft` 可以編輯；可編輯欄位為 `whiskyId`、`title`、`description`、`startingPrice`、`startAt`、`endAt`
- 只有 `draft` 可以 Start；Start 前需通過 Auction Schema 驗證
- Start 後 `status` 為 `active`
- `active` / `scheduled` / `ended` / `cancelled` 不可編輯，也不可 Start

#### 狀態流程

```text
draft ──Start──> active
```

目前只實作 `draft → active`。`scheduled`、`ended`、`cancelled` 已存在於 Schema，但沒有任何流程會進入這些狀態。

#### Admin Auction API

所有 API 需要 JWT 且 `role` 為 `admin`（見第 9 節 Authorization）。

```http
GET    /api/v1/admin/auctions             Auction 列表，依建立時間新到舊
POST   /api/v1/admin/auctions             建立 Auction（status = draft）
PATCH  /api/v1/admin/auctions/:id         編輯 draft Auction
POST   /api/v1/admin/auctions/:id/start   將 draft Start 為 active
```

- 建立：`whiskyId`、`title`、`startingPrice`、`startAt`、`endAt` 必填，`description` 選填
- 編輯：至少一個可編輯欄位
- 編輯或 Start 非 `draft` 的 Auction：回傳 400
- Auction 不存在：回傳 404

#### Admin Auction Management UI

路由：`/admin/auctions`（需登入且為 admin，入口在 `/admin`）

- 顯示 Auction 列表
- 建立 Auction
- `draft` 顯示 Edit / Start；其他狀態不顯示
- 建立與編輯欄位：`whiskyId`、`title`、`description`、`startingPrice`、`startAt`、`endAt`

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
- 只有 `active` 的 Auction 可以出價
- 目前時間到達 `endAt`（含）後禁止新出價
- 第一筆出價：最低出價 = `startingPrice`
- 後續出價：必須 >= 目前最高出價 + 100（同價或低於最低加價皆不允許）
- 目前最高出價（`currentPrice`）由 Bid 資料計算，不寫入 Auction Schema
- 沒有任何 Bid 時，`currentPrice = startingPrice`
- 不檢查 `startAt`；不限制建立者、Admin 出價或同一會員連續出價
- 不處理 Winner，不新增 `winnerId`

#### Bid API

```http
POST /api/v1/auctions/:id/bids   建立出價（需要 JWT）
GET  /api/v1/auctions/:id/bids   取得 Bid History（公開）
```

建立出價：

- Request：`{ "amount": number }`（整數）
- Response 201：`{ "bid": PublicBid, "currentPrice": number }`
- Auction id 格式錯誤、`amount` 驗證失敗：400
- Auction 不存在或為 `draft`：404
- Auction 非 `active`：400
- 已到達 `endAt`：400
- 低於最低出價：400

取得 Bid History：

- Response 200：`{ "bids": PublicBid[], "currentPrice": number }`
- 依出價時間新到舊排列
- Auction 不存在或為 `draft`：404；其他狀態皆可取得

`PublicBid`：`id`、`auctionId`、`userId`、`bidderName`、`amount`、`createdAt`、`updatedAt`。只帶出 User 的 `name`，不回傳 `email`、`passwordHash` 等其他 User 欄位。

### 12.2 尚未實作

- Auction Detail（獨立競標頁）
- 會員出價 UI、目前最高價與 Bid History 的前端顯示
- Countdown
- Auto Close
- Winner
- Transaction／Matching

### 12.3 尚未決定

以下細節尚未討論，不在本規格定義，留待後續 Feature 規格討論：

- 結標規則
- 得標規則
- 即時更新
- 完整交易流程
- `scheduled`、`ended`、`cancelled` 的進入條件與觸發方式
- `endAt` 是否必須晚於 `startAt`
- Start 時是否需比對目前時間與 `startAt`／`endAt`
- `whiskyId` 是否需驗證存在於 Static Dataset

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
11. Phase 3 Auction MVP（Auction Schema、Admin 管理 API、Admin 管理 UI、Bid API）
12. Phase 2 AI Whisky Sommelier
```

目前開發順序：**Phase 1 基礎產品 → Phase 3 Auction MVP → Phase 2 AI Whisky Sommelier**。Auction 屬於 Phase 3，不計入 Phase 2。

Phase 3 後續功能（結標、得標、交易等）需先確認第 12.3 節規則，再另開 Feature 規格；排入時程尚未決定。

---

## 17. 文件狀態

本規格為目前 WhiskyHello v2 的**基準規格（Baseline）**。

任何新增功能、技術變更或 Schema 變更，在開始實作前應先更新本規格並確認變更理由。
