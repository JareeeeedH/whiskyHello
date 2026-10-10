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

### 2.1 風味（Taste）

共 10 種風味，分兩組顯示，每組 5 種：

| 組別 | Key | 名稱 | 例子 |
|---|---|---|---|
| 第一組 | `fruit` | 果香 | 蘋果、西洋梨、柑橘、葡萄乾 |
| 第一組 | `sweet` | 甜香 | 蜂蜜、香草、焦糖、太妃糖 |
| 第一組 | `floral` | 花香 | 石楠花、玫瑰、橙花 |
| 第一組 | `maltGrain` | 麥芽／穀物 | 麥片、餅乾、烤麵包 |
| 第一組 | `nutty` | 堅果 | 杏仁、榛果、核桃 |
| 第二組 | `chocolateCoffee` | 巧克力／咖啡 | 黑巧克力、可可、咖啡 |
| 第二組 | `spice` | 香料 | 肉桂、丁香、黑胡椒、薑 |
| 第二組 | `oak` | 木質／橡木 | 橡木、雪松、檀木 |
| 第二組 | `peat` | 泥煤 | 泥土、海藻、碘酒 |
| 第二組 | `smoke` | 煙燻 | 營火、煙燻培根、焦木 |

舊版的 `driedFruit`（果乾）、`citrus`（柑橘）併入 `fruit`，`vanillaCaramel`（香草／焦糖）併入 `sweet`；原本的細節保留在對應風味的例子中。舊 Key 不再接受（見 2.5）。舊 Key 從未寫入資料庫或瀏覽器儲存，因此不需要資料轉換。

### 2.2 風味評分

每個選取的風味給 1–10 的整數，代表「希望這個風味在這杯威士忌中有多明顯」，不是喜好程度：

| 值 | 說明 |
|---|---|
| `1` | 淡淡帶到即可 |
| `5` | 明顯感受得到 |
| `10` | 希望成為主要風味 |

畫面上 Slider 旁的口語標籤：1–2 淡淡帶到即可、3–4 稍微帶到、5–6 明顯感受得到、7–8 相當突出、9–10 希望成為主要風味。

### 2.3 喝感（Style）

三個 1–10 的整數，皆必填：

| Key | 名稱 | 1 | 10 |
|---|---|---|---|
| `body` | 酒體 | 輕盈 | 厚重 |
| `intensity` | 風味強度（不是酒精濃度） | 柔和 | 強烈 |
| `smoothness` | 順口度 | 粗獷／刺激 | 圓潤／順口 |

### 2.4 情境（Occasion）

單選，共 8 個選項：

| 選項 | 值 |
|---|---|
| 🌙 放鬆獨飲 | `relaxing` |
| 🥃 專心品飲 | `tasting` |
| 🥂 朋友聚會 | `social` |
| 🍽️ 搭配餐點 | `meal` |
| ❤️ 伴侶約會 | `date` |
| 🎁 送禮 | `gift` |
| 🎉 慶祝時刻 | `celebration` |
| ✨ 沒有特定情境 | 不送出 `occasion` |

舊版的 `beginner`、`premium` 已移除，API 不再接受，LLM 也不再萃取。

### 2.5 欄位規則

| 欄位 | 是否必填 | 規則 |
|---|---|---|
| `taste` | 必填 | 物件；只能使用 2.1 的 10 個 Key；必須有 3–5 個 Key；每個值為 1–10 的整數 |
| `style` | 必填 | 物件；`body`、`intensity`、`smoothness` 皆為 1–10 的整數 |
| `occasion` | 選填 | 只能是 2.4 的 7 個值之一；「沒有特定情境」時省略 |
| `budget.min`、`budget.max` | 選填 | 數字，>= 0；可只填其中一個 |
| `freeText` | 選填 | 字串，最多 1,000 字；去除前後空白後為空時視為未填 |

- 沒有選取的風味不出現在 `taste` 中，代表「未指定」，不是低分也不是中間值；任何一端都不會自動補值
- `taste` 中的每個 Key 都必須有合法評分；缺分、`null`、小數、字串、超出 1–10 皆不接受
- 不在 2.1 的 Key（包含 `driedFruit`、`citrus`、`vanillaCaramel` 等舊 Key）一律回 400，不會被默默移除
- Backend 獨立驗證以上規則，不依賴 Frontend

### 2.6 對話式 UI（AI Sommelier 問答）

`/sommelier` 以對話方式逐題詢問，一次只顯示目前的問題，共 9 題。

| 題目 | 對應欄位 | UI 行為 |
|---|---|---|
| 風味第一組「這次，你最想在威士忌中喝到哪些風味？」<br>提示「選 3～4 種就好，挑出這次最想感受到的味道。」 | `taste` | 第一組 5 種風味卡片（名稱、例子）；可直接前往下一組 |
| 風味第二組「再看看這幾種，有沒有也想喝到的？」 | `taste` | 第二組 5 種風味卡片；可「返回上一組」；兩組合計至少 3 種才能「下一步」，直接進入評分 |
| 「你希望這些風味在這杯威士忌中各有多明顯？」<br>提示說明 1／5／10 的意義 | `taste[key]` | 每個已選風味一個 Slider（1–10，預設 5），同時顯示，旁邊顯示口語標籤 |
| 「你喜歡什麼樣的酒體？」 | `style.body` | 單一 Slider（1–10，預設 5） |
| 「你偏好柔和一點，還是風味更鮮明的酒？」 | `style.intensity` | 單一 Slider（1–10，預設 5） |
| 「你比較喜歡圓潤順口，還是帶點粗獷個性的口感？」 | `style.smoothness` | 單一 Slider（1–10，預設 5） |
| 「這次是在什麼情境下喝呢？」<br>提示「選一個最接近的就好。」 | `occasion` | 2.4 的 8 個選項卡片（圖示＋名稱），單選；選了才能「繼續」 |
| 「這次大概想把預算控制在哪裡？」 | `budget.max` | 單一 Slider（1,000–6,000，間隔 100，預設 2,000）；值代表「以內」 |
| 「還有什麼想告訴我的嗎？」 | `freeText` | 自然語言輸入；「完成」送出，「跳過」不送 `freeText` |

選擇風味的規則：

- 一次只顯示一組；選取跨兩組累計，不限定每組數量，某一組可以不選
- 即時顯示「已選 N / 5」；選滿 5 種後其他選項停用，但已選的可以取消
- 在兩組之間切換，或從評分以後的回答「修改」回到選擇，已選的風味和評分都會保留
- 新選取的風味評分從 5 開始；取消選取會移除該風味的評分，重新選取時再從 5 開始
- 評分題只顯示已選風味的 Slider，未選的風味不會出現

頁面以聊天形式呈現：Sommelier 訊息在左（連續訊息共用一個 `S` 頭像），使用者訊息在右；作答 UI 位於對話最下方，作為回覆輸入區。尚未問到的題目不顯示。

每題的節奏：

> 使用者回答（作答 UI 淡出，轉為右側訊息，例如「果香 · 花香」、「果香 7 · 花香 5 · 泥煤 2」、「預算 NT$ 2,000」）→ 約 0.5 秒後進入 Thinking State（基本 0.9–1.7 秒，依下一句長度增加最多 0.5 秒，並有 ±0.15 秒變化）→ Sommelier 回應（偶爾 1 句，整段對話最多 3 次且不連續）→ 下一題 → 回覆輸入區出現

- Thinking State 與 Sommelier 回應為固定文案（deterministic templates），依題目與回答內容選用，不呼叫 LLM、不新增任何 API 請求
- Sommelier 回應只複述已提供的資訊，不推薦酒款、不推測使用者沒提供的內容
- 已回答的內容可以「修改」，回到該題並保留所有回答；重新作答後，之後的對話重新進行
- 最後一題完成或跳過後，立即送出 3.1 的 Step 1 Input（Step 2）；Thinking State 至少維持最短時間，API 較慢時持續到回應為止（超過 4 秒改顯示「還在整理，馬上就好…」）
- Step 2 成功後，Sommelier 依 Preference 產生收尾訊息（評分 >= 7 的風味「為主」、<= 3 的「淡淡帶到」），接著顯示「查看偏好輪廓」；點擊後經 Thinking State 顯示偏好輪廓（風味附評分與口語標籤）
- Step 2 失敗時，Sommelier 以訊息說明錯誤，並提供「重試」與「修改需求」

---

## 3. Data Shape

### 3.1 Input

`POST /api/v1/sommelier/preference`：

```ts
type SommelierInput = {
  taste: Partial<Record<TasteKey, number>>   // 3–5 個 Key，各 1–10
  style: {
    body: number                             // 1–10
    intensity: number                        // 1–10
    smoothness: number                       // 1–10
  }
  occasion?: string                          // 2.4；沒有特定情境時省略
  budget?: {
    min?: number
    max?: number                             // 對話式 UI 只送 max
  }
  freeText?: string                          // 跳過或空白時省略
}
```

範例：

```json
{
  "taste": { "fruit": 9, "floral": 6, "maltGrain": 7, "peat": 2 },
  "style": { "body": 8, "intensity": 6, "smoothness": 9 },
  "occasion": "date",
  "budget": { "max": 2000 },
  "freeText": "今晚和女朋友約會，想喝舒服一點，不要太重。"
}
```

不合法的 Input 回 400，例如：風味少於 3 或多於 5 種、使用未定義或舊的 Key、選取的風味沒有合法評分、評分超出 1–10、不支援的 `occasion`（包含舊的 `beginner`、`premium`）。最上層未定義的欄位（例如舊版的 `dislikes`、`intensity`）會被忽略。

### 3.2 Output

Step 1 的輸出為驗證並整理後的使用者需求，結構與 Input 相同：

- `taste` 只包含使用者選取的風味，依 2.1 的順序排列
- 未填的選填欄位不出現在輸出中
- `freeText` 已去除前後空白

---

## 4. Step 2｜Preference Extraction

### 4.1 目的

讀取 Step 1 的 `freeText`，使用 LLM 將自然語言中可辨識的情境轉成結構化資料，並與 Step 1 的使用者輸入合併，產生後續流程使用的 `Preference`。

LLM 由 Backend 呼叫（依 `WHISKYHELLO_SPEC.md` 第 11 節資料流），Frontend 不直接呼叫 LLM。

### 4.2 LLM Extraction

風味與喝感由使用者以 Slider 明確設定，LLM 不萃取、不修改。從 `freeText` 只萃取以下欄位：

| 欄位 | 說明 | 值 |
|---|---|---|
| `budget` | 價格範圍（`min`、`max`） | 數字，>= 0 |
| `occasion` | 飲酒情境 | 4.3 |
| `mood` | 使用者當下心情 | 4.4 |
| `companion` | 和誰一起喝 | 4.5 |

### 4.3 Occasion

與 2.4 相同的 7 個值：

| 值 | 說明 |
|---|---|
| `relaxing` | 放鬆、獨飲 |
| `tasting` | 專心品飲、細細品嚐 |
| `social` | 朋友聚會、小酌 |
| `meal` | 搭配餐點 |
| `date` | 伴侶、約會 |
| `gift` | 送禮 |
| `celebration` | 慶祝、特別的日子 |

### 4.4 Mood

| 值 | 說明 |
|---|---|
| `positive` | 心情好、開心、想慶祝 |
| `neutral` | 平常、沒有特別情緒 |
| `low` | 低落、疲憊 |
| `stressed` | 壓力大、焦慮 |

### 4.5 Companion

| 值 | 說明 |
|---|---|
| `alone` | 一個人 |
| `friend` | 朋友 |
| `date` | 約會對象 |
| `partner` | 伴侶 |
| `family` | 家人 |

### 4.6 Extraction Rules

- 有明確語意才萃取
- 無法對應既有欄位或既有值時，不要猜測，也不要自行建立新欄位或新值
- 不因單一情緒直接推導不存在的口味偏好
- 使用者沒有提供的資訊不出現
- LLM 回傳不在定義內的欄位或值時，Backend 一律捨棄，不寫入 Preference

LLM Extraction 結果（所有欄位皆可省略）：

```ts
{
  budget?: { min?: number; max?: number }
  occasion?: string
  mood?: string
  companion?: string
}
```

### 4.7 Merge Rules

| 欄位 | 規則 |
|---|---|
| `taste` | 只來自 Step 1，原樣保留；未選取的風味不補值 |
| `style` | 只來自 Step 1，原樣保留 |
| `budget` | `min`、`max` 各自判斷：LLM 有萃取的值覆蓋 Step 1；LLM 未提及的值保留 Step 1 |
| `occasion` | LLM 有萃取時覆蓋 Step 1 的選擇；否則保留 Step 1（「沒有特定情境」時不出現） |
| `mood` | 只來自 LLM |
| `companion` | 只來自 LLM |

沒有 `freeText` 時不呼叫 LLM，`Preference` 直接由 Step 1 輸入轉換。

### 4.8 Output｜Preference

```ts
type Preference = {
  taste: Partial<Record<TasteKey, number>>   // 3–5 個已選風味，各 1–10
  style: {
    body: number
    intensity: number
    smoothness: number
  }
  budget?: {
    min?: number
    max?: number
  }
  occasion?: string                          // 4.3 Occasion
  mood?: string                              // 4.4 Mood
  companion?: string                         // 4.5 Companion
}
```

- `taste`、`style` 一定存在；`taste` 不含未選取的風味
- 沒有資料的選填欄位不出現
- `budget` 沒有 `min` 也沒有 `max` 時不出現

範例：

```json
{
  "taste": { "fruit": 9, "floral": 6, "maltGrain": 7, "peat": 2 },
  "style": { "body": 8, "intensity": 6, "smoothness": 9 },
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
- 使用者需求是否需要儲存

### Step 2

- LLM 呼叫失敗、逾時或回傳格式錯誤時的處理方式
- 合併後 `budget.min` 大於 `budget.max` 時的處理方式
- `Preference` 是否保留原始 `freeText` 供後續 Step 使用
- `freeText` 支援的語言
- Preference 是否需要儲存
- Step 2 之後的流程、API Endpoint 與推薦方式
