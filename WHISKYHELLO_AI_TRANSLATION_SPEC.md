# WhiskyHello AI Whisky Review Translation 規格書

> 所屬範圍：Whisky Detail Page｜知名評論家評論（Static Whisky Dataset `NOTE`）
>
> 本文件範圍：英文評論家評論 → 繁體中文（`zh-TW`）的 On-demand 翻譯
>
> 文件狀態：草案（Draft）

---

## 1. 目的

在 Whisky Detail Page 提供知名評論家英文評論（Static Whisky Dataset `NOTE`）的繁體中文翻譯。

- 只翻譯評論家評論，不翻譯 MongoDB 的酒友評論（Review）。
- 英文原文永遠保留，不被覆蓋。
- 翻譯只輸出譯文，不加評論、不推薦。

---

## 2. 翻譯內容與閱讀結構

### 2.1 英文原文

英文原文是 Source of Truth。

- 保留原始文字，不修改、不改寫。
- 不重排、不重新分段，維持 Static Dataset 的原始格式。
- Frontend 顯示的英文原文即資料內容本身。

### 2.2 繁體中文翻譯：完整翻譯

中文必須是完整翻譯，不是摘要或改寫。

- 完整保留原文所有資訊。
- 保留原文語意與資訊順序。
- 不刪除、不摘要、不自行增加資訊；不逐字直譯，但也不得因意譯而遺漏內容。
- 目標是「忠實原意 + 自然繁體中文」：可調整中文語序，但不得為了通順加入原文不存在的人、事、物或背景資訊。
- 以阿拉伯數字書寫的年份、酒齡、ABV、桶號、瓶數、分數（例如 `SGP:552 - 88 points`）與其他數字原樣保留；原文以英文單字表達的數量（例如 `four distilleries`）依中文習慣自然翻譯（`四家酒廠`）。

#### Whisky 品飲語境

- 以完整句子與 Whisky 品飲語境判斷，不只看單字字典意思。
- 色澤是比喻：`Colour: white wine` → 白葡萄酒色，不可譯為「白酒」。
- 對酒款或品飲的感嘆指的是酒，不是人：`What a taster!` 不可譯為「品酒者」。
- 香氣與風味描述依品飲語境理解，例如 `resinous and almondy herbs` → 帶樹脂感與杏仁味的草本氣息；品飲語境中「香草」指 vanilla，herbs 用「草本」。
- 參考詞彙（不可機械套用，須符合句意）：nose → 香氣、mouth / palate → 口感、finish → 餘韻、peat → 泥煤、smoky → 煙燻、phenolic → 酚香／酚質感、new oak → 新橡木桶、virgin oak → 全新橡木桶、refill → 再填裝桶、first fill → 首次填裝桶、floral → 花香、fruity → 果香、spicy → 辛香、drying → 收乾感、rounded → 圓潤、smooth → 柔順、honeyed → 蜂蜜般的甜香、toasted → 烘烤感。
- 必要時可用「中文（English）」，例如 酚香（phenolic）、全新橡木桶（virgin oak），但應少量使用。

#### 不猜測、不腦補

- 原文沒有明確主詞或行為者時，不自行補上；例如 `with an agreement to buy back...` 不可譯為「雙方協議讓 Cooley 買回……」。
- 保留原文的不確定與不完整，不補完未完成的句子。
- 確定 → 自然繁體中文；常見且明確 → Whisky 領域常見中文；不確定 → 保留英文原文。
- 縮寫原樣保留、不展開：ABV、NAS、HP、WF、SGP。
- 品牌、酒廠、酒款、人名、地名、葡萄品種等專有名詞保留原文（例如 Macallan、Highland Park、Gewürztraminer），不自行創造中文名稱；只有非常常見且明確的正式中文名稱才使用中文。

#### 作者語氣

- 不改變個人意見、推測、不確定性、反問、玩笑、諷刺、正負面評價與語氣強弱。
- 不把不確定語氣譯成確定事實：I think → 我認為、seems → 似乎、perhaps → 也許、probably → 大概。

### 2.3 中文閱讀結構：可重新分段

英文保留原始格式；中文完整保留資訊與語意順序，但可依中文閱讀習慣與 Whisky 品飲結構重新分段。

- 中英文不需要維持相同的段落數量或換行位置。
- 原文有品飲段落時，中文可整理為品飲區塊。每個區塊格式一致：中文標籤獨立一行（不加冒號），下一行起為內容，區塊之間空一行。

| 原文標籤 | 中文標籤 |
|---|---|
| Colour | 色澤 |
| Nose | 香氣 |
| Mouth / Palate | 口感 |
| Finish | 餘韻 |
| Comments | 評語 |

- 標籤的補充說明跟著標籤，例如 `Mouth (neat)` → `口感（純飲）`。
- `With water` 的描述留在所屬區塊內。
- 第一個品飲標籤之前的文字維持在最前面，自成一段；結尾分數維持在原本的位置。

範例（原文為一整段）：

```text
Colour: dark gold. Nose: smooth and rounded... Mouth: again, the oak's too loud... Finish: of medium length... Comments: ...
```

中文可整理為：

```text
色澤
深金色。

香氣
的確相當柔順圓潤……

口感
再一次，橡木的存在感太強……

餘韻
中等長度……

評語
我敢肯定 10 年版……
```

重新分段只用於改善閱讀性，不得造成：

- 資訊遺失
- 摘要
- 句意改變
- 不必要的內容合併
- 新增原文沒有的資訊

核心原則：中英文保持相同的內容對應與語意順序，但不要求格式完全一致。

### 2.4 輸出格式

- 純文字，不使用 Markdown（不使用 `#`、`*`、項目符號或粗體）。
- 不加引號、註解或翻譯說明；不輸出翻譯分析、理由、詞彙說明、自我檢查或額外 Whisky 知識。
- 段落以換行表示；Frontend 以 `white-space: pre-wrap` 原樣呈現。

---

## 3. 翻譯結果驗證（Backend）

OpenAI 輸出存入快取前必須通過驗證，否則回傳 502，且不存檔：

- 去除頭尾空白後不得為空。
- 必須包含中文字。
- 長度介於原文的 0.15 倍到 3 倍之間（排除摘要、截斷或失控輸出）。
- 原文中兩位數以上的數字（年份、酒齡、ABV、桶號、瓶數、分數）必須全部出現在譯文中，千分位逗號不影響比對。

驗證只檢查內容，不檢查段落或換行，因此一整段或重新分段的譯文都可通過。

---

## 4. API

`POST /api/v1/whisky-translations`

Route → Rate Limit → Validation → Controller → Service → Model。Frontend 不直接呼叫 OpenAI，API Key 只存在 Backend。

Request：

```json
{ "whiskyId": "3", "language": "zh-TW", "text": "<Static Dataset NOTE>" }
```

- `whiskyId`：字串，1–64 字。
- `language`：目前只支援 `zh-TW`。
- `text`：去除頭尾空白後 1–5000 字。

Response 200：

```json
{
  "translation": {
    "whiskyId": "3",
    "language": "zh-TW",
    "translatedText": "…",
    "cached": true,
    "createdAt": "2026-10-05T19:28:57.481Z"
  }
}
```

錯誤：

| 狀態碼 | 情境 |
|---|---|
| 400 | Validation 失敗（`{ message: 'Validation failed', details }`） |
| 429 | 超過 Rate Limit（Production 每 15 分鐘 30 次） |
| 502 | OpenAI API 錯誤、回應不完整、拒答，或譯文未通過驗證 |
| 503 | OpenAI 未設定 |
| 504 | OpenAI 逾時 |

OpenAI 原始錯誤只記錄在 Backend log，不回傳 Frontend。

---

## 5. 儲存與快取

獨立的 `WhiskyTranslation` collection，不存入 Review，也不存英文原文：

| 欄位 | 說明 |
|---|---|
| `whiskyId` | Static Dataset whisky id |
| `language` | `zh-TW` |
| `sourceHash` | 英文原文（去除頭尾空白）的 SHA-256 |
| `translatedText` | 譯文 |
| `createdAt` / `updatedAt` | timestamps |

唯一索引：`{ whiskyId, language, sourceHash }`。譯文只會提供給產生它的同一段原文，避免以竄改過的文字污染快取。

流程：查快取 → 命中則回傳（`cached: true`）→ 未命中則呼叫 OpenAI → 驗證 → 存檔 → 回傳（`cached: false`）。同一程序內的並行相同請求共用一次 OpenAI 呼叫；跨程序的重複寫入以唯一索引（E11000）處理，改回傳既有資料。

---

## 6. Frontend UX

位於 Whisky Detail Page「知名評論家評論」區塊，上下堆疊排列，不使用雙欄或聊天氣泡。

| 狀態 | 顯示 |
|---|---|
| 預設 | 英文原文 + `中文翻譯` 按鈕 |
| 翻譯中 | 按鈕顯示 `正在翻譯…` 並停用，英文原文淡化 |
| 完成 | `中文翻譯 · AI` → 繁中譯文 → `顯示原文` |
| 顯示原文 | 英文原文 + `中文翻譯` 按鈕（切回譯文不再發出請求） |
| 錯誤 | 錯誤訊息 + `重試`，英文原文維持顯示 |
