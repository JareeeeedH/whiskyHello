# WhiskyHello RAG Spec — 口味搜尋

> 範圍：Phase 2（AI）｜所屬總規格：`WHISKYHELLO_SPEC.md` 第 11 節
>
> 狀態：建庫與向量比對完成，已用於 Sommelier 第二款；口味搜尋 API 與前端未做

---

## 0. 目前狀態（2026-10）

| 項目 | 檔案（`backend/` 下） | 狀態 |
|---|---|---|
| 切塊（17,344 塊，跳過 2 筆） | `scripts/rag/chunk.mts`、`buildChunks.mts` | ✅ |
| 資料模型 | `src/models/WhiskyNoteChunk.ts` | ✅ |
| Embedding | `src/services/openaiEmbedder.ts` | ✅ |
| 建庫：前 5000 筆寫入 MongoDB（`npm run rag:build`） | `scripts/rag/buildVectors.mts` | ✅ |
| cosine、取前 N 名 | `src/utils/vectorSearch.ts` | ✅ |
| 啟動時讀向量、`searchByFlavour(question, count)` | `src/services/flavourSearchService.ts`、`src/server.ts` | ✅ |
| Sommelier 第二款（偏好組句 → 前 5 名 → LLM 挑一款） | `src/utils/flavourSentence.ts`、`src/services/sommelierService.ts` | ✅ |
| 口味搜尋 API（Validation、Controller、Route、rate limit） | — | 未做 |
| 口味搜尋前端頁面 | — | 未做 |

本地練習庫（`scripts/rag/practiceBuild.mts`、`practiceSearch.mts`，輸出為 JSON、不進 git）只用於測試。

---

## 1. 目標與範圍

- 在 Whisky 頁用一句話描述風味（例如「營火煙燻帶海味」），從評論家品飲筆記找出最接近的酒款，連到站內酒款頁。
- MVP 只做檢索，不讓 LLM 生成回答；驗收通過後再評估。
- Sommelier：第一款不用本資料集（需台灣買得到、符合預算）；第二款從本資料集挑選（`WHISKYHELLO_AI_SOMMELIER_SPEC.md` 4.7）。
- 使用者自己的評論不做向量搜尋。

---

## 2. 資料來源

`frontend/src/data/raw/whiskyDataset.json`，17,346 筆，欄位 `id`、`NAME`、`NOTE`、`SCORE`、`IMAGE_PATH`。`NOTE` 為 WhiskyFun 評論家筆記，著作權屬原作者。

以 `criticReviewParser` 解析：

| 段落 | 篇數 | 長度中位數（字元） |
|---|---|---|
| 開頭評語（無標籤） | 13,822 | 144 |
| Colour | 17,310 | 10 |
| Nose | 17,319 | 304 |
| Mouth（含 Palate、Taste、Mouth (neat)） | 17,313 | 267 |
| Finish | 17,282 | 81 |
| Comments | 17,281 | 120 |

- 99.3% 四段齊全；2 篇解析不出段落。
- 1,912 篇筆記、441 筆酒名含 HTML 字元碼。
- 273 個酒名重複（多 278 筆），id 與筆記不同。
- `SCORE` 是評論家評分，與相似度無關；前端的 `notes-*.json` 是懶載入切檔，不是 RAG chunk。

---

## 3. 切塊規則

**一瓶酒一塊**：整瓶中位數約 870 字元（約 200 token），不會稀釋語意；結果本來就是一瓶酒；跨段落的需求（聞起來煙燻、喝起來甜）較容易命中。

```text
{NAME}
Nose: {nose}
Mouth: {mouth}
Finish: {finish}
Comments: {comments}
```

- 放：酒名（含酒廠、桶型）、Nose、Mouth、Finish、Comments（喝完的結論，常含風格總結與相似酒款）。
- 不放：開頭評語（喝之前的背景，約一半是閒聊）、Colour。
- 標籤統一為英文；`Palate`、`Taste`、`Mouth (neat)` 一律為 `Mouth:`；缺少的段落省略；`With water:` 保留；不依長度切分。
- 清理：HTML 字元碼用 `entities` 解碼；整理空白；**保留重音符號**；原始資料不修改。
- 解析不出段落的跳過並記 log；重複酒名每筆都建。

---

## 4. 資料模型：`whiskynotechunks`

| 欄位 | 說明 |
|---|---|
| `whiskyId` | Static Dataset 的 `id`，對應 `/whiskies/:id` |
| `name` | 清理後的酒名 |
| `text` | 送去 embedding 的 chunk 全文，也是摘句與 Sommelier 候選內容的來源 |
| `embedding` | 1536 維，`[Number]`（每筆約 20 KB） |
| `embeddingModel` | 換模型時判斷是否重建 |
| `sourceHash` | `text` 的 SHA-256，未變更則重跑時跳過 |
| `createdAt`、`updatedAt` | timestamps |

- 唯一索引 `whiskyId + embeddingModel`；不存 `__v`、`points`。
- 與翻譯快取 `whiskytranslations` 分開：產生方式、重建時機、唯一性都不同。
- 容量：5000 筆約 103 MB（Atlas 免費上限 512 MB）；全部約 356 MB，要做全部時改存 float32 二進位（約 121 MB）。

---

## 5. Embedding 與搜尋

- 模型 `text-embedding-3-small`，1536 維；後端自行產生，不用 Atlas Auto Embedding、不建 Atlas Vector Search 索引。
- 建庫與搜尋必須同一模型（`openaiEmbedder.ts` 的 `EMBEDDING_MODEL`）。

```text
【啟動】連上 MongoDB → 背景讀全部向量進記憶體（不擋住網站啟動）
【搜尋】問題 → embedding → 記憶體算 cosine → 前 N 名
```

- 每次搜尋不讀資料庫，只呼叫一次 OpenAI；5000 筆比對約 7–9 ms。
- 向量未讀完或讀取失敗時只停用搜尋，不影響其他功能。
- 中文問題不翻譯，直接 embedding。
- Sommelier 的問題由 `buildEmbeddingSentence` 把偏好組成英文句子（只放風味與酒體，不放情境、預算）。
- 摘句顯示時附 WhiskyFun 出處。

---

## 6. 建庫流程（離線）

腳本在 `backend/scripts/`，以 tsx 執行，不在後端編譯範圍；直接 import 前端的 `criticReviewParser.ts`。

```text
npm run rag:chunks   raw JSON → 切段落 → 清理 → chunks.jsonl（不呼叫 API）
npm run rag:build    chunks.jsonl → embedding → whiskynotechunks（以 sourceHash 跳過未變更）
```

- 輸出檔在 `.gitignore`；`rag:build` 會沿用本地練習庫已有的向量。
- 費用：5000 筆約 110 萬 tokens，約 $0.022 美元。

---

## 7. 測試結果與已知問題

**中文問句（8 題）**：原句命中 9/25；先翻成英文 17/25、改寫成品飲筆記 16/25。

**Sommelier 組句（5 組）**：命中約 77%，前 5 名沒有其他烈酒；加上情境與預算會干擾泥煤這類強烈風味，因此已拿掉。

已知問題：

- 其他烈酒（蘭姆、干邑、Cachaça、Mezcal）常出現在中文問句的結果中。
- 酒名含關鍵字容易排前面（Big Peat、White Oak）。
- 部分酒名其實是一句評論（`So you thought 64.45% vol. was a lot?...`）。
- 同一款酒的不同年份會同時佔掉候選名額（例如 Dalwhinnie 15 出現兩次）。
- 主要風味不一定排在句子前面（風味照固定順序排）。
- 關鍵詞命中只能參考；正式驗收需要有標註答案的題庫。

**記憶體**：常駐約 85 MB（直接用 MongoDB 回傳的陣列約 200 MB，所以複製成新陣列）；讀取 7–20 秒，高峰約 450 MB，Railway 需至少 512 MB。

---

## 8. 待做與待決定

| 項目 | 狀態 |
|---|---|
| Railway 記憶體是否足夠 | 待確認 |
| 口味搜尋 API | 初定 `POST /api/v1/flavour-search` |
| 前端呈現方式 | 未討論 |
| 驗收題庫（15–20 題，中英文） | 未做 |
| 同名酒款去重、風味依分數排序 | 待評估 |
| 其他烈酒過濾、酒名是一句話的資料 | 待查筆數與處理方式 |
| 中文問題是否翻譯 | 暫不翻譯，準度不夠再加 |
| 是否加上 LLM 生成回答 | 驗收通過後評估；不可捏造未檢索到的酒款與風味 |

---

## 9. 先不做

- 一瓶切成多塊、依長度硬切
- 建庫前大量清詞規則
- 複雜 rerank、酒廠規則引擎
- 中文版 chunk
