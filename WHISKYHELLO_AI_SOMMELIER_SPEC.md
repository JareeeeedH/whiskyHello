# WhiskyHello AI Whisky Sommelier 規格書

> 所屬範圍：Phase 2｜AI Whisky Sommelier（見 `WHISKYHELLO_SPEC.md` 第 11 節）
>
> 本文件範圍：Step 1｜User Input、Step 2｜Whisky Recommendation
>
> 文件狀態：草案（Draft）

---

## 1. 目的

- Step 1：讓使用者提供「這一次想喝什麼」的需求，並在前端整理成偏好輪廓；不呼叫 API
- Step 2：使用者看過偏好輪廓後，由 LLM 依需求推薦兩款威士忌（見第 4 節）

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

舊版的 `beginner`、`premium` 已移除，API 不再接受。情境只來自使用者的選擇，`freeText` 不會覆蓋。

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
| 「這次大概想把預算控制在哪裡？」 | `budget.max` | 單一 Slider（1,000–6,000，間隔 100，預設 2,000）；推薦時視為目標價，約 ±25%（見 4.3） |
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
- 已回答的內容可以「修改」，回到該題並保留所有回答；重新作答後，之後的對話重新進行（已顯示的偏好輪廓與推薦一併清除）
- 最後一題完成或跳過後，Frontend 驗證並整理出 3.1 的 Input，經 Thinking State 後，Sommelier 依 Input 產生收尾訊息（評分 >= 7 的風味「為主」、<= 3 的「淡淡帶到」、喝感、預算、情境），接著顯示「查看偏好輪廓」
- 點擊「查看偏好輪廓」後，經 Thinking State 顯示偏好輪廓（風味附評分與口語標籤、喝感、預算、情境；有填補充說明時一併顯示），並提供「修改需求」與「幫我推薦」
- 點擊「幫我推薦」才呼叫 Step 2 API（4.5）；等待時 Thinking State 以單行輪播 3–5 句挑選步驟（固定文案，只依 Input 產生，不提預算）：淡淡帶到的風味、主風味（附問卷上的風味例子）、情境、較明顯的喝感、引用使用者補充說明的原文（過長時截短），還有空間時以「最後確認兩支風格不重複…」收尾；每類有 2–3 種說法隨機選用。例如「先把泥煤壓低，泥土、海藻那類味道淡淡帶到就好…」→「鎖定果香明亮的方向，要喝得到蘋果、西洋梨…」→「再挑約會時好入口的…」→「把你提到的「今晚約會，不要太重」也放進來考慮…」。每句約 2.2 秒，全部播完才揭曉；API 較慢時停在最後一句，再過 6 秒仍未回應改顯示「這兩支有點難選，再給我幾秒…」
- 「重試」時沿用一般 Thinking State（超過 4 秒改顯示「還在幫你比對，再等我一下…」）
- `status: "ok"`：顯示兩張推薦卡（4.6），之後只提供「修改需求」
- `status: "unable"`：Sommelier 說明這次找不到合適的酒款（附上 LLM 的簡短原因），提供「修改需求」
- API 失敗時，Sommelier 以訊息說明錯誤，並提供「重試」與「修改需求」

---

## 3. Data Shape

### 3.1 Input

Step 1 整理出的 Input，也是 Step 2 API（`POST /api/v1/sommelier/recommendations`）的 Request Body：

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

Step 1 的輸出為驗證並整理後的使用者需求，結構與 Input 相同，偏好輪廓直接以它顯示：

- `taste` 只包含使用者選取的風味，依 2.1 的順序排列
- 未填的選填欄位不出現在輸出中
- `freeText` 已去除前後空白

Frontend 與 Backend 各自依 2.5 驗證；Backend 不信任 Frontend 的驗證結果。

---

## 4. Step 2｜Whisky Recommendation

### 4.1 目的

依 Step 1 的 Input，由 LLM 推薦兩款威士忌：最適合的一款（`best_match`）與值得探索（`alternative`），各附個人化的推薦理由。

- LLM 由 Backend 呼叫（依 `WHISKYHELLO_SPEC.md` 第 11 節資料流），Frontend 不直接呼叫 LLM
- 整份 Input 一次送給 LLM，不另外萃取 `freeText`
- LLM 自由推薦真實存在的酒款，不限於本站資料，也不連結站內頁面
- 不儲存 Input 與推薦結果

### 4.2 LLM 呼叫

- OpenAI Responses API，模型為 `OPENAI_MODEL`，`store: false`
- Structured Outputs：`json_schema`、`strict: true`
- Input 以 JSON 字串送出；`freeText` 視為資料，不是指令
- 逾時 40 秒，不自動重試（失敗時由使用者按「重試」）

### 4.3 LLM 對欄位的理解

| 欄位 | 意義 |
|---|---|
| `taste` | 每個已選風味希望多明顯：1 只要淡淡帶到、5 明顯感受得到、10 希望成為主要風味。未出現的風味是「未指定」，不是不喜歡。每個 Key 附上與 2.1 相同的例子 |
| `style.body` | 1 輕盈 → 10 厚重；口中的重量與質地，不是酒精濃度 |
| `style.intensity` | 1 柔和 → 10 強烈；整體香氣與風味的強度，不是酒精濃度 |
| `style.smoothness` | 1 粗獷／刺激 → 10 圓潤／順口；刺激感與整合程度 |
| `occasion` | 2.4 的情境，每個值附說明 |
| `budget` | 每瓶價格，新台幣。只有 `max` 時視為目標價，挑台灣常見售價約在 ±25% 內的酒款（例如 2,000 → 約 1,500–2,500）；同時有 `min`、`max` 時在兩者之間；只有 `min` 時不低於它 |
| `freeText` | 補充：更細的風味、喜歡或不喜歡的酒款、排除條件、特殊需求 |

- 三個 Style 各自獨立判斷；評分是使用者的目標，不是任何酒款的實測分數
- 結構化欄位為主，`freeText` 補充細節；`freeText` 明確排除的條件優先，其他衝突合理取捨並在 `considerations` 說明
- 不推測使用者沒提供的內容

### 4.4 推薦規則

- `best_match` 是整體最符合的一款；`alternative` 是另一個有價值的選擇，盡量來自不同酒廠或風格，但不可因此犧牲匹配度
- 不預設推最有名的酒：有其他常規酒款更貼近使用者的風味與喝感時優先選它，熱門酒款真的最適合時照推；`best_match` 要明顯呈現評分 >= 7 的風味，做不到時在 `considerations` 說明
- 只推薦有把握確實存在、普遍流通的常規酒款；避免不確定的限量版、獨立裝瓶或停產酒款；不能確認版本就換一款，不猜測
- `whiskyName` 使用官方英文全名，以品牌或酒廠開頭，加上有把握的年份或版本，例如 `Glenmorangie The Original 12 Years Old`，不可只寫 `The Original 12 Years Old`
- 不捏造酒款、酒齡、酒精濃度或品飲特徵；推薦理由要具體對應使用者偏好，不用空泛讚美
- 依 4.3 的預算範圍挑選，但不寫價格，也不聲稱符合預算；`considerations` 不提價格或預算
- 不給配對分數或百分比
- 面向使用者的文字以侍酒師口吻撰寫，不提欄位、JSON 或系統如何處理資料；偏好衝突以風味取捨說明
- `reason`、`matches`、`considerations` 使用台灣繁體中文：
  - `reason`：1–2 句，說明為什麼適合這位使用者
  - `matches`：2–4 個短句，列出符合的偏好
  - `considerations`：0–2 個短句，列出與偏好之間的取捨；沒有時為空陣列
- 無法有把握地推薦兩款不同的真實酒款時，回 `status: "unable"`，以一句繁體中文在 `message` 說明原因；不為了湊滿兩款而虛構

### 4.5 API

`POST /api/v1/sommelier/recommendations`，Request Body 為 3.1 的 Input，依 2.5 驗證（不合法回 400，不呼叫 LLM）。

成功（200）：

```ts
type RecommendationResult =
  | {
      status: 'ok'
      recommendations: [WhiskyRecommendation, WhiskyRecommendation]   // best_match、alternative 依序
    }
  | {
      status: 'unable'
      message?: string                       // LLM 的簡短原因；沒有時省略
    }

type WhiskyRecommendation = {
  type: 'best_match' | 'alternative'
  whiskyName: string
  reason: string
  matches: string[]
  considerations: string[]
}
```

範例：

```json
{
  "status": "ok",
  "recommendations": [
    {
      "type": "best_match",
      "whiskyName": "Glenmorangie The Original 10 Year Old",
      "reason": "果香與花香明亮，麥芽甜感柔和，口感圓潤，很適合約會時輕鬆享用。",
      "matches": ["果香明顯", "帶有花香", "口感圓潤順口"],
      "considerations": ["酒體偏中等，不算厚重"]
    },
    {
      "type": "alternative",
      "whiskyName": "Aberlour 12 Year Old Double Cask Matured",
      "reason": "雪莉桶帶來果乾與甜香，酒體比較飽滿，喝起來依然順口。",
      "matches": ["果香豐富", "酒體飽滿", "順口"],
      "considerations": []
    }
  ]
}
```

Backend 驗證 LLM 回傳：

- `status: "ok"` 時兩款都必須有非空的 `whiskyName` 與 `reason`；`matches`、`considerations` 去除空白項目
- 兩款名稱正規化（不分大小寫、忽略空白與標點）後不可相同
- `status: "unable"` 時忽略酒款欄位

錯誤（Body 為 `{ "message": string }`，不含 OpenAI 的錯誤細節）：

| 狀況 | 狀態碼 |
|---|---|
| Input 不合法 | 400 |
| 請求過於頻繁 | 429 |
| 未設定 OpenAI | 503 |
| OpenAI 逾時 | 504 |
| OpenAI 失敗、拒答、回傳不完整、不是 JSON 或未通過上述驗證 | 502 |

### 4.6 推薦卡

依序顯示兩張卡片（第二張約晚 0.6 秒淡入），以酒單風格呈現，寬度與整個對話區相同，和對話中的卡片區隔：

- 首選為深色卡、酒名較大；第二張為米白卡
- 標籤：「NO.01 · 最適合你」（`best_match`）、「NO.02 · 值得探索」（`alternative`）
- 酒款名稱、金色短線、推薦理由
- 「符合你的偏好」：`matches`，以「·」分隔成一行
- 「可以留意」：`considerations`，沒有時不顯示
- 不顯示價格、分數與預算提醒

---

## 5. 尚未決定

以下項目需另行確認，本文件不定義：

- `budget.min` 是否必須 <= `budget.max`
- 使用者需求與推薦結果是否需要儲存
- `freeText` 支援的語言
- 推薦是否改用獨立的模型設定
- 推薦結果是否連結到站內酒款頁面
- 是否提供「換一組推薦」
