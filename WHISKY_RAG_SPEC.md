# WhiskyHello RAG Spec — 口味搜尋

> 範圍：Phase 2（AI）
>
> 文件狀態：已定案，尚未實作
>
> 所屬總規格：`WHISKYHELLO_SPEC.md` 第 11 節

---

## 1. 目標

在 Whisky 頁提供**口味搜尋**：使用者用一句話描述想喝的風味（例如「營火煙燻帶海味」），系統從 Static Dataset 的評論家品飲筆記中找出風味最接近的酒款，結果可點進站內酒款頁。

MVP 只做**檢索（語意搜尋）**，不讓 LLM 生成回答。檢索準度通過驗收後，再評估是否加上生成（見第 9 節）。

### 不在本次範圍

- **Sommelier 推薦不改用本資料集**：資料集以老酒、獨立裝瓶、限量款為主，且沒有價格；Sommelier 的規則是推薦台灣買得到的常規款，並符合預算，兩者衝突。
- 使用者自己的評論不需要向量搜尋，日後直接放進 Sommelier prompt 即可。

---

## 2. 資料來源與實測數據

來源：`frontend/src/data/raw/whiskyDataset.json`，共 17,346 筆；每筆欄位為 `id`、`NAME`、`NOTE`、`SCORE`、`IMAGE_PATH`。

`NOTE` 是一整篇評論家筆記（WhiskyFun，著作權屬原作者）。以 `criticReviewParser` 解析的實測結果：

| 段落 | 出現篇數 | 長度中位數（字元） | 90% 以內 |
|---|---|---|---|
| 開頭評語（無標籤） | 13,822 | 144 | 324 |
| Colour | 17,310 | 10 | 15 |
| Nose | 17,319 | 304 | 476 |
| Mouth（含 Palate、Taste、Mouth (neat)） | 17,313 | 267 | 414 |
| Finish | 17,282 | 81 | 144 |
| Comments | 17,281 | 120 | 234 |

- 99.3% 的筆記四個段落（Nose、Mouth、Finish、Comments）齊全；2 篇解析不出任何段落。
- 約一半的 Nose 和 Mouth 段落含 `With water:`（加水後的描述）。
- 1,912 篇筆記、441 筆酒名含 HTML 字元碼（例如 `&egrave;`、`&mdash;`）。
- 273 個酒名重複出現（多 278 筆），id 與筆記各不相同。

`SCORE`（例如 `SGP: 357 - 86 points`）是評論家評分，與向量相似度無關。

前端的 `notes-*.json` 是懶載入用的切檔，不是 RAG chunk。

---

## 3. 切塊規則

### 一瓶酒一塊

約 17,300 塊。不再切成 nose、mouth、comments 三塊，原因：

- 整瓶內容中位數約 870 字元（約 200 token），合成一塊不會稀釋語意。
- 口味搜尋的結果本來就是「一瓶酒」，一瓶一塊省掉同瓶多次命中的彙整與排名邏輯。
- 「聞起來煙燻、喝起來偏甜」這類跨段落的需求，整瓶一起比對較容易命中。

### 內容

```text
{NAME}
Nose: {nose}
Mouth: {mouth}
Finish: {finish}
Comments: {comments}
```

| 段落 | 放不放 | 原因 |
|---|---|---|
| 酒名 | 放 | 使用者常以酒廠名稱為參考；酒名常含桶型資訊 |
| Nose、Mouth、Finish | 放 | 口味搜尋的主力 |
| Comments | 放 | 喝完後寫的結論；抽樣約 40% 含整體風格總結（例如「rustic and robust」）。約 27% 提到別瓶酒，其中約一半是有用的相似性線索（例如「has the body of Lagavulin」）；閒聊約占 18%，篇幅短，影響有限 |
| 開頭評語 | 不放 | 喝之前寫的背景與預期，抽樣幾乎沒有實際風味描述，約 52% 是閒聊 |
| Colour | 不放 | 對口味搜尋幫助小 |

- 標籤統一寫成英文 `Nose:`、`Mouth:`、`Finish:`、`Comments:`；原文的 `Palate`、`Taste`、`Mouth (neat)` 一律輸出為 `Mouth:`。
- 缺少的段落整行省略，不留空標籤。
- `With water:` 保留在原段落中。
- 不再依長度切分。

### 文字清理

1. HTML 字元碼轉回字元（`cr&egrave;me` → `crème`），酒名與筆記都要處理；使用完整的解碼方法，不手寫對照表。
2. 整理多餘空白與換行，去掉頭尾空白。
3. **保留重音符號**：語意比對不依賴字母完全相同，去掉重音反而會改變名稱（`Càrn Mor`）或字義。
4. 原始資料檔不修改，只在建庫時轉換。

### 例外處理

- 解析不出任何段落的筆記：跳過，記錄在 log。
- 重複酒名：每筆都建，搜尋結果顯示時處理同名並排。

---

## 4. 資料模型

新增 collection `whiskynotechunks`（Model：`WhiskyNoteChunk`），與翻譯快取 `whiskytranslations` 分開，沿用其慣例。

| 欄位 | 說明 |
|---|---|
| `whiskyId` | 對應 Static Dataset 的 `id` 與 `/whiskies/:id` |
| `name` | 清理後的酒名 |
| `points` | 從 `SCORE` 取出的分數，供顯示與篩選；無法解析則不存 |
| `text` | 送去 embedding 的完整 chunk 文字，也是搜尋結果摘句的來源 |
| `embedding` | 1536 維向量，存成 BSON float32 二進位格式 |
| `embeddingModel` | 例如 `text-embedding-3-small`，換模型時判斷是否需重建 |
| `sourceHash` | `text` 的 SHA-256；未變更則重跑時跳過 |
| `createdAt`、`updatedAt` | timestamps |

- 不存 `__v`（`versionKey: false`）。
- 唯一索引：`whiskyId + embeddingModel`。
- 預估每筆約 7–8 KB，全部約 120–135 MB；Atlas 免費方案上限 512 MB。

### 不與翻譯快取合併的原因

- 產生方式不同：翻譯是使用者觸發、一次一筆；chunk 是腳本一次建立全部。
- RAG 會因換模型、調整規則而重建；分開時可清空重建，不會誤刪翻譯。
- 唯一性規則不同，合併後無法用索引保證。

---

## 5. Embedding 與向量索引

- 模型：OpenAI `text-embedding-3-small`，1536 維（預設維度）。
- 向量由後端自行產生，**不使用** Atlas Auto Embedding。
- **建庫與搜尋必須使用同一個模型與維度**；後端啟動時檢查設定。
- Atlas Vector Search 索引（類型 `vectorSearch`）：
  - `path`：`embedding`
  - `numDimensions`：1536
  - `similarity`：`cosine`
  - filter 欄位：`points`

---

## 6. 建庫流程（離線）

腳本放在 `backend/scripts/`，以 tsx 執行，不在後端編譯範圍內；直接 import `frontend/src/utils/criticReviewParser.ts`，不另寫一套解析。

```text
階段一：產生 chunk（不呼叫付費 API）
  讀 raw JSON → criticReviewParser 切段落 → 挑出四段 → 清理文字
  → 組成 chunk → 寫入本機檔案（JSONL）→ 人工檢查

階段二：建立向量
  讀 JSONL → 分批呼叫 OpenAI embedding → 寫入 whiskynotechunks
```

- 本機輸出檔加入 `.gitignore`，不 commit、不公開。
- 階段二以 `sourceHash` 判斷是否已建立，可中斷後續跑。

---

## 7. 搜尋流程（線上）

```text
使用者問題 → 後端以同一模型 embedding → Atlas $vectorSearch（取前 N 筆）
          → 回傳酒款、分數、命中摘句、酒款頁連結
```

- 照既有分層：Route → Validation → Controller → Service → Model。
- 摘句顯示時附 WhiskyFun 出處。
- 先用近似搜尋；驗收時與 `exact: true` 比對結果差異。
- 中文問題：MVP 先直接搜，以驗收題庫決定是否先翻成英文再搜。

---

## 8. 執行步驟與驗收

1. 更新規格書（本文件與 `WHISKYHELLO_SPEC.md`）。
2. 階段一：產生全部 chunk，人工檢查。
3. 試跑 500 瓶：確認實際容量，並以驗收題庫測試。
4. 全量建庫。
5. 搜尋 API 與前端畫面（動手前另行討論）。

### 驗收題庫

準備 15–20 題，中英文都要有，例如：泥煤、果香、雪莉桶、藥水味、海岸風格、「像 Lagavulin」、「熱帶水果」。檢查：

- 前幾名是否合理。
- 命中摘句是否真的對應問題。
- 中文題的效果是否明顯比英文差。

---

## 9. 待決定

| 項目 | 狀態 |
|---|---|
| HTML 字元碼的解碼方式 | 先查現有依賴；若需新增套件（例如 `he`、`entities`）須經同意 |
| Atlas 向量索引的建立方式 | 後台手動建立，或由程式建立 |
| 搜尋 API 設計 | 未討論 |
| 前端呈現方式 | 未討論 |
| 中文問題是否先翻譯 | 以驗收結果決定 |
| 是否加上 LLM 生成回答 | 檢索驗收通過後評估；加上時禁止捏造未檢索到的酒款與風味 |

---

## 10. 先不做

- 一瓶切成多塊、依長度硬切
- 建庫前大量清詞規則
- 複雜 rerank、酒廠規則引擎
- 中文版 chunk（需先翻譯全部資料）
- 把前端 note 切檔當成 RAG chunk
