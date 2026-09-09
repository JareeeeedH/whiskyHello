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

第一階段先建立穩定的威士忌基礎產品；第二階段再加入 AI Whisky Sommelier；第三階段再延伸至酒款買賣媒合。

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


### Phase 3｜交易媒合

7. **酒款買賣媒合**

目前僅規劃「買賣媒合」，不預設實作平台金流、物流、Escrow 或完整交易系統。

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

目前 MongoDB 第一階段只建立兩個 Model：

- User
- Review

### User Schema

```text
User
├── _id
├── name
├── email
├── passwordHash
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
| `email` | 登入帳號 |
| `passwordHash` | 雜湊後密碼，不儲存明文密碼 |
| `avatar` | 使用者頭像 |
| `bio` | 個人簡介 |
| `createdAt` | 建立時間 |
| `updatedAt` | 更新時間 |

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

目前第一階段正式定義的 API 只有 Auth 與 Review。

### Auth

```http
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me
```

### Review

```http
GET    /api/v1/whiskies/:whiskyId/reviews
POST   /api/v1/reviews
PATCH  /api/v1/reviews/:id
DELETE /api/v1/reviews/:id
GET    /api/v1/me/reviews
```

### Authorization

- Register / Login：公開
- `GET /api/v1/auth/me`：需要 JWT
- 建立 Review：需要 JWT
- 修改 Review：需要 JWT，且只能修改自己的 Review
- 刪除 Review：需要 JWT，且只能刪除自己的 Review
- `GET /api/v1/me/reviews`：需要 JWT


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

## 12. Phase 3｜酒款買賣媒合

目標不是立即建立完整電商交易平台，而是先提供：

> **收藏家有酒想出售 → 有需求的使用者找到酒 → 雙方媒合**

初期不預設處理：

- 平台金流
- Escrow
- 物流
- 拍賣
- 複雜交易爭議系統

正式開發前，需另外進行台灣酒類販售／轉讓及相關平台責任的合規評估。

---

## 13. Phase 1 的非目標（Non-Goals）

為避免專案過度擴張，Phase 1 明確不做：

- AI Whisky Sommelier
- 完整 AI Agent 系統
- 酒款 Marketplace
- Auction
- 酒款金流
- 酒款物流
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
8. **Phase 1 完成並驗證後，再進入 Phase 2。**
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
11. 再評估 Phase 2 AI Whisky Sommelier
```

---

## 17. 文件狀態

本規格為目前 WhiskyHello v2 的**基準規格（Baseline）**。

任何新增功能、技術變更或 Schema 變更，在開始實作前應先更新本規格並確認變更理由。
