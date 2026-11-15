# WhiskyHello RAG Spec — 口味搜尋

> 範圍：Phase 2（AI）｜所屬總規格：`WHISKYHELLO_SPEC.md` 第 11 節

---

## 0. 進度

| 步驟 | 內容 | 檔案（`backend/` 下） | 狀態 |
|---|---|---|---|
| 1. 切塊 | 清洗後資料 → `chunks.jsonl`（14,553 行） | `scripts/rag/buildChunks.mts`、`chunk.mts` | ✅ |
| 2. 資料模型 | `whiskychunks`，含 `points` | `src/models/WhiskyChunk.ts` | ✅ |
| 3. 建庫 | 全部建、寫入 `points`、刪除已不存在的 `whiskyId`；每批 100 筆 embedding 後立即寫入（約 US$0.07）；14,553 筆、資料 315.5 MB | `scripts/rag/buildVectors.mts` | ✅ |
| 4. 向量索引 | `whisky_chunk_vector`：`embedding`、1536 維、cosine；建庫腳本最後建立並等到 READY | `scripts/rag/buildVectors.mts`、`src/models/WhiskyChunk.ts` | ✅ |
| 5. 搜尋 | `$vectorSearch`（`numCandidates` = 筆數 × 20）；後端不存向量；資料庫未連線或搜尋失敗時跳過第二款 | `src/services/flavourSearchService.ts`、`src/services/sommelierService.ts` | ✅ |
| 6. 驗證 | 6 組偏好實際搜尋（每次約 0.3–4 秒）；庫內 14,553 筆皆為清洗保留酒款；後端測試；本機 Sommelier 兩款皆有 | — | ✅ |
| 7. 上線 | push 後 Railway 重新部署 | — | 未做 |
| 口味搜尋 API、前端頁面 | — | — | 未做 |

- 舊向量 collection 已刪除；第 7 步前不要重新部署 Railway 後端（正式站第二款依賴記憶體中的舊向量）

---

## 1. 目標與範圍

- Sommelier 第二款：依使用者偏好，從評論家品飲筆記找出最接近的 5 款，交給 LLM 挑一款（`WHISKYHELLO_AI_SOMMELIER_SPEC.md` 4.7）。第一款不用本資料集。
- 口味搜尋（未做）：用一句話描述風味，找出最接近的酒款並連到酒款頁。
- 使用者自己的評論不做向量搜尋。

---

## 2. 資料來源

清洗後的 Static Dataset：`buildChunks` 讀 `frontend/src/data/raw/whiskyDataset.json`，先跑前端的 `cleanWhiskyDataset`（`frontend/src/utils/whiskyClean.ts`），與網頁同一套規則。

- 17,346 筆 → 清洗保留 14,555 筆（排除非威士忌與酒名是一句話，見 `WHISKYHELLO_SPEC.md` §7 Cleaning）
- `NOTE` 為 WhiskyFun 評論家筆記，著作權屬原作者；顯示摘句時附出處

---

## 3. 切塊規則

一瓶酒一塊，共 14,553 塊（2 筆解析不出段落，跳過）。

```text
{NAME}
Nose: {nose}
Mouth: {mouth}
Finish: {finish}
Comments: {comments}
```

- 放：酒名（含酒廠、桶型）、Nose、Mouth、Finish、Comments
- 不放：開頭引言（多為背景與閒聊，常提到其他酒款）、Colour
- 段落用前端 `criticReviewParser` 解析；`Palate`、`Taste`、`Mouth (neat)` 一律寫成 `Mouth:`；缺少的段落省略；`With water:` 保留在原段落
- 不依長度切分：長度中位數約 910 字元，最長約 2,760 字元（約 700 token）
- 同名酒款每筆都建

---

## 4. 資料模型：`whiskychunks`

| 欄位 | 說明 |
|---|---|
| `whiskyId` | Static Dataset 的 `id`，對應 `/whiskies/:id` |
| `name` | 清洗後的酒名 |
| `points` | 評論家分數，可為空；供之後篩選 |
| `text` | 送去 embedding 的全文，也是摘句與 Sommelier 候選內容的來源 |
| `embedding` | 1536 維，`[Number]` |
| `embeddingModel` | 產生向量的模型；換模型時判斷是否重建 |
| `sourceHash` | `text` 的 SHA-256；未變更則重建時跳過 |
| `createdAt`、`updatedAt` | timestamps |

- 唯一索引 `whiskyId + embeddingModel`；不存 `__v`
- 容量：約 315 MB，加上向量索引（Atlas 免費方案上限 512 MB）

---

## 5. Embedding 與搜尋

- 模型 `text-embedding-3-small`，1536 維（`openaiEmbedder.ts` 的 `EMBEDDING_MODEL`）；建庫與搜尋必須同一模型
- 搜尋使用 **Atlas Vector Search**：資料庫依向量索引找出最接近的 N 筆，後端不存向量

```text
【搜尋】問題 → OpenAI embedding → $vectorSearch（whiskychunks）→ 前 N 名（whiskyId、name、text、相似度）
```

- 向量索引 `whisky_chunk_vector`：欄位 `embedding`、1536 維、cosine
- Sommelier 的問題由 `buildEmbeddingSentence` 把偏好組成英文句子（只放風味與酒體，不放情境、預算）
- 搜尋失敗時只停用 Sommelier 第二款，不影響其他功能
- 中文問題目前直接 embedding

---

## 6. 建庫流程（離線）

腳本在 `backend/scripts/rag/`，以 tsx 執行，不在後端編譯範圍；直接 import 前端的 `whiskyClean.ts`、`criticReviewParser.ts`。

```text
npm run rag:chunks   raw JSON → 清洗 → 切段落 → chunks.jsonl（不呼叫 API）
npm run rag:build    chunks.jsonl → embedding → whiskychunks → 向量索引
```

`rag:build`：
- 全部 14,553 塊；每批 100 筆，每批完成即寫入（中途失敗重跑會接續）
- `sourceHash` 相同則跳過
- 刪除 `chunks.jsonl` 已不存在的 `whiskyId`
- 輸出檔在 `.gitignore`
- 費用：約 330 萬 tokens，約 US$0.07

---

## 7. 已知問題

- 酒名含關鍵字容易排前面（Big Peat、White Oak）
- 同一款酒的不同年份可能同時佔掉候選名額
- 主要風味不一定排在句子前面（風味照固定順序組句）
- 組句只有風味詞，沒有桶型：甜、巧克力、堅果的偏好不一定找到雪莉桶
- 筆記中的閒聊與比喻（如「could as well be rum」）會稀釋或干擾語意
- 約 170 篇筆記依賴上下文（`same as above`），單獨被檢索時資訊不足
- 正式驗收需要有標註答案的題庫

### 7.1 測試紀錄（2026-11-15，優化前基準）

前五名，`numCandidates` 100；快速搜尋與精確搜尋（`exact: true`）前五名一致（5 題 5/5）。

**英文偏好組句（Sommelier 現行）**：分數 0.81–0.84

| 偏好 | 結果 |
|---|---|
| 泥煤煙燻、重酒體 | ✅ 多為泥煤款；混入 The Spice King（酒名） |
| 花香果香、輕酒體 | ✅ Dalwhinnie 15、Strathisla |
| 甜、巧克力、堅果 | ⚠️ 第 1 名波本桶，非雪莉桶 |
| 麥芽、穀物、清爽 | ✅ Loch Lomond grain、Strathmill 12 |
| 辛香、橡木 | ✅ 酒名含 Oak 者偏前 |
| 水果甜＋微煙燻 | ⚠️ 煙燻不明顯 |
| 巧克力咖啡、重酒體 | ✅ Macduff 1974（coffee、chocolate） |
| 堅果、麥芽 | ✅ Strathmill 12 |
| 煙燻＋水果 | ✅ Muckle Flugga |
| 泥煤＋辛香＋橡木（5 種混合） | ⚠️ 泥煤偏弱 |

- 偏好 2–3 種時準；4–5 種混合時主風味被平均掉
- 分數差距小（約 0.03），排名區分度低

**中文自然語言直接搜尋**：分數 0.60–0.78，23 題中約 4 題可用

| 輸入 | 結果 |
|---|---|
| 煙燻重，像消毒水 | ✅ 泥煤款；混入 Smoked Rum |
| 不要太烈，順口，蜂蜜水果香 | ❌ 5 款中 4 款非威士忌 |
| 雪莉桶，葡萄乾、巧克力 | ⚠️ 不像雪莉桶 |
| 適合新手，不要泥煤 | ❌ 找到泥煤款 |
| 像香草冰淇淋甜甜的 | ⚠️ 靠酒名 Vanilla |
| 熱帶水果，芒果鳳梨 | ⚠️ 筆記不符 |
| 跟 Lagavulin 16 很像 | ❌ 只找到 5 個 Lagavulin 16 |
| 送爸爸生日禮物，三千左右 | ❌ 酒名含 Birthday、Family |
| 海風鹹味 | ⚠️ 多為泥煤款 |
| 波本桶香草、椰子 | ❌ 第 1 名為雪莉風格 |
| 濃郁厚實，尾韻長 | ⚠️ 集中日台酒款 |
| 日本威士忌，清爽優雅 | ❌ 酒名含 Japan；輕井澤非清爽 |
| 辛辣胡椒，不要泥煤 | ❌ 找到重煙燻 |
| 喝 Macallan 12，想找類似但不貴 | ❌ 只找到 Macallan |
| 新手，黑牌太辣，想要順口蜂蜜花香 | ❌ 酒名含 John、Black；混入 Vogelbeer |
| 愛 Laphroaig 10，找一樣重煙燻 | ⚠️ 只找到 Laphroaig 10 |
| 放鬆，香草焦糖、圓潤 | ✅ Balblair 2000 |
| 蘋果、水蜜桃、西洋梨果香 | ✅ Tomatin Contrast；混入 Cider Brandy |
| 厚重、黑巧克力咖啡、雪莉桶 | ⚠️ 混入波本桶 |
| 不要泥煤，熱帶水果奶油香 | ⚠️ 集中日本酒；混入泥煤款 |
| 鹹鹹海風味，煙燻不要太重 | ❌ 全為重煙燻；第 1 名 Smoked Rum |
| 肉桂丁香黑胡椒，尾韻長 | ❌ 第 1 名五糧液 |
| 葡萄酒桶，紅色莓果、單寧 | ❌ 第 1 名 Apple Brandy |

- 常比對到酒名而非風味（Japan、Peat、Storm、John、Birthday）
- 否定與程度詞無效（不要泥煤、煙燻不要太重）
- 提到酒名只找回同款，無法「找類似」
- 中文輸入偏向日本、台灣酒款
- 預算、場合無法用向量處理
- 清洗漏網的非威士忌（約 160 筆）在自然語言輸入下常出現
- 具體風味描述（如列出水果）結果最好

**優化方向**：LLM 先把中文改寫成英文品飲筆記口吻、否定與產地改用篩選；提到酒名時以該酒筆記找相似並排除同品牌；rerank；同名去重；補清洗規則

---

## 8. 待做與待決定

| 項目 | 狀態 |
|---|---|
| 口味搜尋 API | 初定 `POST /api/v1/flavour-search` |
| 前端呈現方式 | 未討論 |
| 驗收題庫（15–20 題，中英文） | 未做 |
| 同名酒款去重 | 待評估 |
| re-rank | 待評估 |
| 中文問題改寫成英文品飲筆記口吻 | 待評估 |
| 開頭引言是否放入 chunk | 有題庫後比較 |
| 是否加上 LLM 生成回答 | 驗收通過後評估；不可捏造未檢索到的酒款與風味 |

---

## 9. 先不做

- 一瓶切成多塊、依長度硬切
- 中文版 chunk
- 酒廠規則引擎

---

## 10. 後續構想（未核准，僅備註）

### 10.1 酒款頁「風味相近的酒」

**來由**：Search Console（2026-11，近 28 天）顯示自然流量主要來自大量酒款詳情頁的長尾搜尋，單頁點擊少但頁數多。

**構想**：每個酒款頁下方顯示 5 支風味相近的酒款，用現有向量做相似度檢索（不呼叫 LLM）。

**做法方向**：
- 離線腳本事先算好每支酒最相近的 5 支，存入資料庫
- 酒款頁只讀預先算好的結果
- 資料更新時重跑腳本

**預期效益**：
- SEO：增加酒款頁之間的內部連結
- 使用者：可繼續瀏覽相近酒款，並導向 AI 侍酒師
- 作品集：向量檢索實際用於產品功能

**待決定**：同名酒款去重；是否加 LLM 一句話說明相似原因；實作前需核准並補完整規格（資料模型、API、前端呈現）
