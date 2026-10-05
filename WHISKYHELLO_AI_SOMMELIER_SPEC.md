# WhiskyHello AI Whisky Sommelier 規格書

> 所屬範圍：Phase 2｜AI Whisky Sommelier（見 `WHISKYHELLO_SPEC.md` 第 11 節）
>
> 本文件範圍：Step 1｜User Input、Step 2｜Preference Extraction
>
> 文件狀態：草案（Draft）

---

## 1. Step 1 目的

讓使用者提供「這一次想喝什麼」的需求，作為後續 AI Whisky Sommelier 流程的輸入。

Step 1 只負責收集與整理使用者需求，不包含推薦、AI 呼叫或結果顯示。

---

## 2. 欄位定義

### 2.1 Flavor Tags

`taste` 與 `dislikes` 共用同一組固定的 Flavor Tags：

| Tag | 說明 |
|---|---|
| `sweet` | 甜感 |
| `fruity` | 果香 |
| `floral` | 花香 |
| `vanilla` | 香草 |
| `woody` | 木質／橡木桶 |
| `spicy` | 辛香料 |
| `smoky` | 煙燻 |
| `peaty` | 泥煤 |
| `maritime` | 海潮／鹹味 |

### 2.2 Occasion

| 值 | 說明 |
|---|---|
| `relaxing` | 放鬆、獨飲 |
| `social` | 聚會、朋友小酌 |
| `meal` | 搭配餐點 |
| `gift` | 送禮 |
| `beginner` | 入門、第一次嘗試 |
| `premium` | 特別場合、想喝好一點 |

### 2.3 欄位說明

| 欄位 | 用途 | 是否必填 | 可否為空 |
|---|---|---|---|
| `taste` | 這次喜歡、想喝到的風味 | 必填 | 可為空陣列 `[]` |
| `dislikes` | 這次不想要的風味（舊欄位，對話式 UI 不送出） | 選填 | 省略時視為 `[]` |
| `intensity` | 泥煤與煙燻的強度（2.5） | 選填 | 可省略 |
| `intensity.peaty` | 泥煤強度 | 選填 | 可省略 |
| `intensity.smoky` | 煙燻強度 | 選填 | 可省略 |
| `budget` | 這次的價格範圍 | 選填 | 可省略 |
| `budget.min` | 預算下限 | 選填 | 可省略 |
| `budget.max` | 預算上限 | 選填 | 可省略 |
| `occasion` | 這次的飲酒情境 | 選填 | 可省略 |
| `freeText` | 以自然語言補充需求（例如「想找適合冬天、不要太烈的酒」） | 選填 | 可省略 |

### 2.4 欄位規則

- `taste`、`dislikes`：可複選，值只能是 2.1 的 Flavor Tags，同一陣列內不重複
- `intensity.peaty`、`intensity.smoky`：整數，0–100；可只填其中一個
- `budget.min`、`budget.max`：數字，>= 0；可只填其中一個
- `occasion`：單選，值只能是 2.2 的 Occasion
- `freeText`：字串；去除前後空白後為空時視為未填

### 2.5 Intensity

以 0–100 的刻度表示使用者希望的泥煤（`peaty`）與煙燻（`smoky`）程度：

| 值 | 說明 |
|---|---|
| `0` | 不想要 |
| `1`–`100` | 數字越大越強烈 |

### 2.6 對話式 UI（AI Sommelier 問答）

`/sommelier` 以對話方式固定詢問 4 題，一次只顯示目前的問題（進度 01 / 04 – 04 / 04）：

| 題目 | 對應欄位 | UI 行為 |
|---|---|---|
| Q1「這次想喝到哪些風味？」 | `taste` | 複選 `sweet`、`fruity`、`floral`、`vanilla`、`woody`、`spicy`；至少選 1 個才能繼續 |
| Q2「泥煤與煙燻，你希望到什麼程度？」 | `intensity` | 兩個 Slider（0–100，間隔 1，預設 0）；0 代表這次不想要；沒移動也送出目前值 |
| Q3「這次大概想把預算控制在哪裡？」 | `budget.max` | 單一 Slider（1,000–6,000，間隔 100，預設 2,000）；值代表「以內」，沒移動也送出 2,000 |
| Q4「還有什麼想告訴我的嗎？」 | `freeText` | 自然語言輸入；「完成」送出，「跳過」不送 `freeText`；去除前後空白後為空時視為未填 |

頁面以聊天形式呈現：Sommelier 訊息在左（連續訊息共用一個 `S` 頭像），使用者訊息在右；作答 UI 位於對話最下方，作為回覆輸入區。尚未問到的題目不顯示。

每題的節奏：

> 使用者回答（作答 UI 淡出，轉為右側 `YOU` 訊息，例如「甜感 · 果香」、「預算 NT$ 2,000」）→ 0.2–0.4 秒後進入 Thinking State（0.8–1.5 秒）→ Sommelier 回應（1 句）→ 下一題 → 回覆輸入區出現

- Thinking State 與 Sommelier 回應為固定文案（deterministic templates），依步驟與回答內容選用，不呼叫 LLM、不新增任何 API 請求
- Sommelier 回應只複述已提供的資訊，不推薦酒款、不推測使用者沒提供的內容
- 已回答的內容可以「修改」，回到該題並保留所有回答；重新作答後，之後的對話重新進行
- Q4 完成或跳過後，立即送出 3.1 的 Step 1 Input（Step 2）；Thinking State 至少維持最短時間，API 較慢時持續到回應為止（超過 4 秒改顯示「還在整理，馬上就好…」）
- Step 2 成功後，Sommelier 依 Preference 產生收尾訊息（4.8：`freeText` 提到的泥煤／煙燻優先於 Slider 的描述），接著顯示「查看偏好輪廓」；點擊後經 Thinking State 顯示偏好輪廓（4.9）
- Step 2 失敗時，Sommelier 以訊息說明錯誤，並提供「重試」與「修改需求」
- UI 不提供 `dislikes` 與 `occasion`；API 仍接受這兩個欄位
- `smoky`、`peaty`、`maritime` 保留在 Flavor Tags 中，供 `freeText` 萃取與 API 相容使用

---

## 3. Data Shape

### 3.1 Input

對話式 UI（2.6）送出的 Step 1 Input：

```ts
type SommelierInput = {
  taste: string[]          // 至少 1 個
  intensity: {
    peaty: number          // 0–100
    smoky: number          // 0–100
  }
  budget?: {
    max?: number           // Q3 Slider 的值
  }
  freeText?: string        // Q4 跳過或空白時省略
}
```

範例：

```json
{
  "taste": ["sweet", "fruity", "vanilla"],
  "intensity": { "peaty": 0, "smoky": 30 },
  "budget": { "max": 2000 },
  "freeText": "今晚和女朋友約會，想喝舒服一點，不要太重。"
}
```

Q4 跳過：

```json
{
  "taste": ["sweet"],
  "intensity": { "peaty": 0, "smoky": 0 },
  "budget": { "max": 2000 }
}
```

`POST /api/v1/sommelier/preference` 為相容舊用法，仍接受以下完整欄位（`taste` 以外皆可省略，`dislikes` 省略時視為 `[]`）：

```ts
{
  taste: string[]
  dislikes?: string[]
  intensity?: {
    peaty?: number
    smoky?: number
  }
  budget?: {
    min?: number
    max?: number
  }
  occasion?: string
  freeText?: string
}
```

API 最小輸入：

```json
{
  "taste": []
}
```

### 3.2 Output

Step 1 的輸出為驗證並整理後的使用者需求，結構與 Input 相同，作為後續 Step 的輸入：

- `taste`、`dislikes` 一定存在（沒有選擇時為 `[]`；`dislikes` 由 Backend 驗證補上）
- 未填的選填欄位不出現在輸出中
- `freeText` 已去除前後空白

---

## 4. Step 2｜Preference Extraction

### 4.1 目的

讀取 Step 1 的 `freeText`，使用 LLM 將自然語言中可辨識的需求轉成結構化 Preference，並與 Step 1 的使用者輸入合併，產生後續流程使用的 `Preference`。

LLM 由 Backend 呼叫（依 `WHISKYHELLO_SPEC.md` 第 11 節資料流），Frontend 不直接呼叫 LLM。

### 4.2 LLM Extraction

從 `freeText` 萃取以下欄位：

| 欄位 | 說明 | 值 |
|---|---|---|
| `taste` | 想要的風味與程度 | 4.3 |
| `dislikes` | 不想要的風味 | 2.1 Flavor Tags |
| `budget` | 價格範圍（`min`、`max`） | 數字，>= 0 |
| `occasion` | 飲酒情境 | 4.4 |
| `mood` | 使用者當下心情 | 4.5 |
| `companion` | 和誰一起喝 | 4.6 |

### 4.3 Taste

使用 2.1 Flavor Tags。每個 taste 包含：

- `tag`：Flavor Tag
- `level`：`low` / `medium` / `high`

| Level | 說明 |
|---|---|
| `low` | 只要一點點（例如「微甜」） |
| `medium` | 一般程度；未提及程度時使用 |
| `high` | 明確強調（例如「很甜」「重泥煤」） |

### 4.4 Occasion

沿用 2.2 Occasion，另加 `date`：

| 值 | 說明 |
|---|---|
| `relaxing` | 放鬆、獨飲 |
| `social` | 聚會、朋友小酌 |
| `meal` | 搭配餐點 |
| `gift` | 送禮 |
| `beginner` | 入門、第一次嘗試 |
| `premium` | 特別場合、想喝好一點 |
| `date` | 約會 |

`date` 目前只能由 `freeText` 萃取，Step 1 表單不提供此選項。

### 4.5 Mood

| 值 | 說明 |
|---|---|
| `positive` | 心情好、開心、想慶祝 |
| `neutral` | 平常、沒有特別情緒 |
| `low` | 低落、疲憊 |
| `stressed` | 壓力大、焦慮 |

### 4.6 Companion

| 值 | 說明 |
|---|---|
| `alone` | 一個人 |
| `friend` | 朋友 |
| `date` | 約會對象 |
| `partner` | 伴侶 |
| `family` | 家人 |

### 4.7 Extraction Rules

- 有明確語意才萃取
- 無法對應既有欄位或既有值時，不要猜測，也不要自行建立新欄位或新值
- 不因單一情緒直接推導不存在的口味偏好（例如「心情不好」不代表想要 `sweet`）
- 使用者沒有提供的資訊維持空值：陣列為 `[]`，選填欄位不出現
- LLM 回傳不在定義內的欄位或值時，Backend 一律捨棄，不寫入 Preference

LLM Extraction 結果（所有欄位皆可省略）：

```ts
{
  taste?: { tag: string; level: 'low' | 'medium' | 'high' }[]
  dislikes?: string[]
  budget?: { min?: number; max?: number }
  occasion?: string
  mood?: string
  companion?: string
}
```

### 4.8 Merge Rules

將 Step 1 的明確輸入與 LLM Extraction 結果合併。兩者衝突時：

> `freeText` 的自然語言需求優先於 Step 1 的表單選擇。

| 欄位 | 規則 |
|---|---|
| `taste` | 取聯集；Step 1 的 Tag 轉為 `level: medium`；同一 Tag 兩邊都有時使用 LLM 的 `level` |
| `dislikes` | 取聯集 |
| `taste` ↔ `dislikes` | Step 1 `taste` 的 Tag 出現在 LLM `dislikes` 時，從 `taste` 移除；Step 1 `dislikes` 的 Tag 出現在 LLM `taste` 時，從 `dislikes` 移除 |
| `intensity` | 只來自 Step 1，原樣保留（包含 `0`）；LLM 不萃取此欄位 |
| `intensity` ↔ LLM `peaty`／`smoky` | `intensity` 數值不被修改；`freeText` 提到的泥煤／煙燻照一般規則進入 `taste`／`dislikes`。兩者衝突時，自然語言（`taste`／`dislikes` 中的 `peaty`、`smoky`）優先，對話式 UI 的總結以它為準 |
| `budget` | `min`、`max` 各自判斷：LLM 有萃取的值覆蓋 Step 1；LLM 未提及的值保留 Step 1 |
| `occasion` | LLM 有萃取時覆蓋 Step 1；否則保留 Step 1 |
| `mood` | 只來自 LLM |
| `companion` | 只來自 LLM |

沒有 `freeText` 時不呼叫 LLM，`Preference` 直接由 Step 1 輸入轉換（Tag 轉為 `level: medium`）。

合併範例：

```jsonc
// Step 1
{
  "taste": ["smoky", "fruity"],
  "dislikes": [],
  "budget": { "min": 1000, "max": 3000 },
  "occasion": "relaxing",
  "freeText": "今晚約會，心情很好，想喝很甜的，不要煙燻，2000 以內"
}

// LLM Extraction
{
  "taste": [{ "tag": "sweet", "level": "high" }],
  "dislikes": ["smoky"],
  "budget": { "max": 2000 },
  "occasion": "date",
  "mood": "positive",
  "companion": "date"
}

// Preference
{
  "taste": [
    { "tag": "fruity", "level": "medium" },
    { "tag": "sweet", "level": "high" }
  ],
  "dislikes": ["smoky"],
  "budget": { "min": 1000, "max": 2000 },
  "occasion": "date",
  "mood": "positive",
  "companion": "date"
}
```

### 4.9 Output｜Preference

Step 2 的最終輸出：

```ts
type Preference = {
  taste: {
    tag: string                        // 2.1 Flavor Tags
    level: 'low' | 'medium' | 'high'
  }[]
  dislikes: string[]                   // 2.1 Flavor Tags
  intensity?: {                        // 2.5 Intensity
    peaty?: number
    smoky?: number
  }
  budget?: {
    min?: number
    max?: number
  }
  occasion?: string                    // 4.4 Occasion
  mood?: string                        // 4.5 Mood
  companion?: string                   // 4.6 Companion
}
```

- `taste`、`dislikes` 一定存在（沒有資料時為 `[]`），同一陣列內 Tag 不重複
- 同一個 Tag 不會同時出現在 `taste` 與 `dislikes`（依 4.8 處理 Step 1 與 LLM 之間的衝突）
- 沒有資料的選填欄位不出現
- `intensity` 沒有 `peaty` 也沒有 `smoky` 時不出現
- `budget` 沒有 `min` 也沒有 `max` 時不出現

範例：

```json
{
  "taste": [
    { "tag": "sweet", "level": "high" }
  ],
  "dislikes": ["smoky"],
  "budget": { "max": 2000 },
  "occasion": "date",
  "mood": "positive",
  "companion": "date"
}
```

---

## 5. 尚未決定

以下項目需另行確認，本文件不定義：

### Step 1

- 預算幣別與單位
- `budget.min` 是否必須 <= `budget.max`
- 同一個 Tag 是否可以同時出現在 Step 1 的 `taste` 與 `dislikes`
- `freeText` 的長度上限
- 是否允許所有欄位皆未填（`taste`、`dislikes` 皆為空且無選填欄位）
- 使用者需求是否需要儲存

### Step 2

- LLM 供應商、模型與 Prompt
- LLM 呼叫失敗、逾時或回傳格式錯誤時的處理方式
- 合併後 `budget.min` 大於 `budget.max` 時的處理方式- Step 1 表單是否加入 `occasion: date`
- `Preference` 是否保留原始 `freeText` 供後續 Step 使用
- `freeText` 支援的語言
- Preference 是否需要儲存
- Step 2 之後的流程、API Endpoint 與推薦方式
