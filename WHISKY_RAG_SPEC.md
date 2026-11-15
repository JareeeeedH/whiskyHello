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
| 5. 搜尋 | `$vectorSearch`（`numCandidates` = 筆數 × 20）；後端不存向量；資料庫未連線或搜尋失敗時 Sommelier 回 503 | `src/services/flavourSearchService.ts`、`src/services/sommelierService.ts` | ✅ |
| 6. 驗證 | 實際搜尋、庫內皆為清洗保留酒款、後端測試（§7.1） | — | ✅ |
| 7. Rerank | 向量前 30 → 去重 → cross-encoder 取前 3（§7.2） | `src/services/rerankService.ts`、`src/utils/dedupeWhiskies.ts` | ✅ |
| 8. Sommelier 串接 | 意圖判斷＋改寫 → 搜尋 → rerank → 推薦卡 | `src/services/sommelierService.ts`、`src/services/openaiWhiskyRecommender.ts` | ✅ |
| 9. 上線 | Backend、Frontend 一起部署 | — | 未做 |
| 口味搜尋 API、前端頁面 | — | — | 未做 |

- 正式站仍是舊版 Sommelier，依賴記憶體中的舊向量（舊 collection 已刪），Railway 重啟即失效
- 上線前確認 Railway 記憶體（rerank 約 +130 MB）

---

## 1. 目標與範圍

- Sommelier：使用者的一段話經 LLM 改寫成英文，從評論家品飲筆記找出最接近的 3 款（向量前 30 → 去重 → rerank），各寫一張推薦卡（`WHISKYHELLO_AI_SOMMELIER_SPEC.md`）
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
- Sommelier 的問題：LLM 把使用者的話改寫成英文品飲筆記口吻（否定轉正面、找類似時描述風味、不放價格與場合），見 `WHISKYHELLO_AI_SOMMELIER_SPEC.md` §2.1
- 搜尋失敗時 Sommelier 回 503，不影響其他功能

**Rerank（Sommelier）**

```text
改寫後的英文查詢 → $vectorSearch 前 30 → 同名去重 → cross-encoder 逐篇評分 → 前 3
```

- 模型 `Xenova/ms-marco-MiniLM-L-6-v2`（Transformers.js，q8，只支援英文）；讀「問題＋chunk `text`」，上限 512 token
- 一次評 1 篇（一起評會補齊長度，較慢且吃記憶體）；30 篇約 0.25 秒，記憶體約 +130 MB
- 伺服器啟動時於背景載入（首次從 Hugging Face 下載約 23 MB）；失敗時改用向量前 3 名
- 去重：酒名去掉括號後相同視為同一款，保留向量分數最高者

---

## 6. 建庫流程（離線）

腳本在 `backend/scripts/rag/`，以 tsx 執行，不在後端編譯範圍；直接 import 前端的 `whiskyClean.ts`、`criticReviewParser.ts`。

```text
npm run rag:chunks   raw JSON → 清洗 → 切段落 → chunks.jsonl（不呼叫 API）
npm run rag:build    chunks.jsonl → embedding → whiskychunks → 向量索引
npm run rag:eval     20 題驗收（§7.4）
npm run rag:eval:real  25 題真實輸入（§7.5）
```

`rag:build`：
- 全部 14,553 塊；每批 100 筆，每批完成即寫入（中途失敗重跑會接續）
- `sourceHash` 相同則跳過
- 刪除 `chunks.jsonl` 已不存在的 `whiskyId`
- 輸出檔在 `.gitignore`
- 費用：約 330 萬 tokens，約 US$0.07

---

## 7. 已知問題

- 清洗漏網的非威士忌約 160 筆（梅斯卡爾、雅馬邑、卡爾瓦多斯、蘭姆酒、白酒等）仍在庫中
- 指名酒款時（Talisker 10 好喝嗎）只找回同品牌
- 常客：少數酒款常出現在不同問題的結果（Lost Irish、Kilkerran 13）
- Reranker 只支援英文、上限 512 token，長筆記後段（Finish、Comments）會被截掉
- 筆記中的閒聊與比喻（如「could as well be rum」）會稀釋或干擾語意
- 約 170 篇筆記依賴上下文（`same as above`），單獨被檢索時資訊不足
- 預算、價格無法用向量處理
- 否定條件仍常失效（§7.4）

### 7.1 測試紀錄（2026-11-15，優化前基準）

前五名，`numCandidates` 100；快速搜尋與精確搜尋（`exact: true`）前五名一致（5 題 5/5）。

**英文偏好組句（舊版 Sommelier 的勾選輸入）**：分數 0.81–0.84

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

### 7.2 測試紀錄：向量前 30 → cross-encoder rerank 前 3（2026-11-16）

Reranker：`Xenova/ms-marco-MiniLM-L-6-v2`（Transformers.js，只支援英文）

| 設定 | rerank 30 篇（中位數） | 記憶體最高 |
|---|---|---|
| fp32，一次 30 篇 | 808 ms | 1,130 MB |
| q8，一次 5 篇 | 371 ms | 580 MB |
| **q8，一次 1 篇（採用）** | **244 ms** | **372 MB**（模型與推論約 +130 MB） |

- q8 與 fp32 前 3 名幾乎相同（10 題中 1 題第 3 名不同）

**英文偏好組句 + rerank**（10 題同 7.1）：6 題變好、3 題持平、1 題仍差
- 變好：甜／巧克力／堅果找到雪莉桶（Aberlour 16）；麥芽清爽（Aberfeldy 12）；酒名關鍵字款（The Spice King）被移除
- 仍差：5 種混合（泥煤＋辛香＋橡木），rerank 分數全低
- 選中的酒多在向量第 15–30 名
- 常客：Lost Irish、Kilkerran 13 各出現在 3 題

**中文 → LLM 改寫成英文（規則同 Whiskey-Assistant）→ rerank**（23 題同 7.1）：約 16 題準、6 題普通、1 題差（7.1 直接搜約 4 題可用）
- 向量分數 0.60–0.78 → 0.80–0.87
- 否定有效（不要泥煤、煙燻不要太重）；找類似時不再只回同款（Lagavulin 16 → Port Askaig 等）
- 23 題結果無非威士忌
- rerank 分數 ≥ 2 多半準；< 1 偏勉強（可作門檻）
- 預算、價格仍無法處理
- 改寫耗時 1.7–4.9 秒

### 7.3 最終流程實測（2026-11-16，本機）

流程：意圖判斷＋改寫 → 向量前 30 → 去重 → rerank 前 3 → LLM 推薦卡

**優化前後對照**

| 指標 | 中文直接搜（7.1） | 改寫＋rerank（現行） |
|---|---|---|
| 可用題數（23 題） | 約 4 | 約 16 準、6 普通、1 差 |
| 向量分數 | 0.60–0.78 | 0.80–0.87 |
| 非威士忌出現在結果 | 常見（5 題） | 0 |
| 否定（不要泥煤） | 失效 | 有效 |
| 找類似（像 Lagavulin 16） | 只回同款 | 回其他酒款 |
| 非找酒輸入 | 照樣推薦或 502 | 固定提示，不搜尋、不扣次數 |

**意圖判斷**：6/6 正確

| 輸入 | 結果 |
|---|---|
| 你好、asdfgh、雪莉桶是什麼？、推薦一款清酒 | `off_topic` |
| 天冷想喝點暖身的、Talisker 10 好喝嗎 | 推薦 3 款 |

**耗時**

| 步驟 | 約 |
|---|---|
| 意圖判斷＋改寫 | 1.2–4 秒 |
| 搜尋＋去重＋rerank | 0.5 秒（rerank 0.25 秒） |
| 推薦卡 | 4–6 秒 |
| 合計（推薦） | 7–10 秒 |
| 合計（`off_topic`） | 1.2–2.5 秒 |

**資源**：rerank 模型與推論約 +130 MB；本機開發模式後端約 238 MB

**範例**

| 輸入 | 推薦 3 款 |
|---|---|
| 鹹鹹海風味，煙燻不要太重 | Caol Ila 'Cobbler's Hearth'、An Orkney Distillery 1998、Isle of Skye 12 |
| 不要泥煤，熱帶水果、奶油香、柔和 | Bowmore 1964、Bowmore 1976、Lost Irish |
| 想找跟 Lagavulin 16 很像的酒 | Port Askaig 系 Islay 8 yo、Elements of Islay Peat & Sherry、Speyside 'Heavily Peated' |

- 推薦卡會誠實寫出落差（如「仍帶有克制的煙燻感」「熱帶水果較不突出」）

### 7.4 驗收題庫（`npm run rag:eval`）

- 題目：`backend/scripts/rag/evalQuestions.json`，20 題（風味 8、否定 4、找類似 2、英文 1、模糊 2、非找酒 3；14 題沿用 7.1）
- 範圍：意圖＋改寫 → 向量前 30 → 去重 → rerank 前 3；不寫推薦卡（每題 1 次 LLM）
- 判斷：筆記（不含酒名行）每組「必須有」至少一個詞、「不能有」的詞都沒有；找類似另檢查酒名不是原品牌
- 限制：只看有沒有提到，不看是否為主要風味；「no peat」也算提到
- 詳細結果輸出到 `scripts/rag/output/eval-日期.json`（不進 git）

| 日期 | 意圖 | 符合需求：向量前 3 | 符合需求：rerank 前 3 | 不重複酒款 | 常客（≥3 次） |
|---|---|---|---|---|---|
| 2026-11-16 | 20/20 | 36/45（80%） | **39/45（87%）** | 49/51 | 無 |

2026-11-16 觀察：
- 風味、找類似：全部 3/3（第 7 題 1 支為關鍵字誤判：Bordeaux Merlot 桶的筆記沒寫 wine）
- 否定最弱：「新手不要泥煤」1/3、「辛辣不要泥煤」1/3（rerank 仍選到 Spice King、Talisker Storm）
- rerank 主要幫在多重條件（第 2、3、6 題 2/3 → 3/3）
- 找類似未推原品牌（Lagavulin、Macallan 0 次）

### 7.5 真實輸入題庫（`npm run rag:eval:real`）

- 題目：`backend/scripts/rag/evalRealQuestions.json`，25 題，照真人打字方式（酒名 5、送禮預算場合 5、口語短句錯字 5、比較追問非找酒 5、熱門推薦 5）
- 範圍：意圖＋改寫 → 向量前 30 → 去重 → rerank 前 3；無標準答案，人工評分

| 日期 | 意圖 | ✅ | ⚠️ | ❌ | 不重複酒款 | 常客（≥3 次） |
|---|---|---|---|---|---|---|
| 2026-11-16 | 25/25 | 11 | 10 | 4 | 59/72 | Nikka Coffey Malt ×5、Campbeltown 8 ×3、Glen Grant 1990 ×3 |

2026-11-16 觀察：
- 好：中文酒名與錯字（麥卡倫、白州、雪梨桶）、口語（泥煤味重點、不要太嗆）、反向需求（Talisker 太鹹想甜一點）
- 酒精度未考慮：好入口、不要太烈、新手、尾牙、highball 推到 48–60% 原桶強度
- 熱門、價格、最近、CP 值無法處理（4 題 ❌）；「台灣熱門」沒有噶瑪蘭
- 模糊需求改寫成相似句子（smooth、honey、vanilla）→ 常客
- 只打酒名時改寫可能只寫酒名（噶瑪蘭 → "Kavalan"），結果為少見單桶
- rerank 擠掉向量前 3 的合適款（Macallan 12 Sherry Oak、南投）
- 改善方向：改寫時輸出篩選條件（酒精度上限、官方裝瓶、產地），後端從酒名解析（`%`、`OB`、`Japan`/`Taiwan`）後先篩選再 rerank

### 7.6 問題分類（追蹤用）

| 類型 | 說明 | 例（§7.4 驗收／§7.5 真實） | 方向 | 狀態 |
|---|---|---|---|---|
| 語意模糊 | 使用者沒講清楚，只能猜 | 真實 #11、14、17 | 見下方 A–C | 後續 |
| 資訊缺口 | 意思清楚，但資料沒有（價格、熱門、上市時間） | 真實 #6、21、22、23 | 見下方 D–G | 後續 |
| 條件沒有執行 | 理解了、資料也有，但沒篩選（酒精度、產地） | 真實 #8、9、11、14、19、21、24 | 改寫輸出篩選條件，後端解析酒名 | 未處理 |
| 否定失效 | 「不要泥煤」找到泥煤酒 | 驗收 #9、10 | 改寫不寫被否定的風味；rerank 後過濾 | 未處理 |
| 指名酒款 | 本尊不在前 3，或推出少見單桶 | 真實 #1、5 | 第 1 張放本尊，其餘找其他酒廠相近款 | 未處理 |
| 多支比較 | 只搜到其中一支 | 真實 #16 | 拆成兩次搜尋 | 未處理 |
| 缺少上下文 | 追問不知道上一輪 | 真實 #17 | 附上前一輪問題 | 未處理 |
| rerank 排錯 | 向量前幾名的合適款被擠掉 | 真實 #1、14、21 | 排序納入向量分數 | 未處理 |
| 常客 | 不同問題推同幾款 | Nikka Coffey Malt ×5 | 改寫只用使用者的詞；跨題降權 | 未處理 |
| 改寫自編風味 | LLM 憑印象補風味或只寫酒名 | 真實 #5、21 | 指名酒款改用資料庫筆記搜尋 | 未處理 |
| 買不到 | 多為老酒、獨立裝瓶、單桶 | 大部分結果 | 優先官方裝瓶；卡片標示 | 未處理 |
| 資料品質 | 漏網非威士忌約 160 筆、`same as above` 約 170 篇 | — | 補清洗規則 | 暫不做 |

---

## 8. 待做與待決定

| 項目 | 狀態 |
|---|---|
| 口味搜尋 API | 初定 `POST /api/v1/flavour-search` |
| 前端呈現方式 | 未討論 |
| 否定改善（改寫時完全不寫被否定的風味；或 rerank 後過濾） | 待評估（§7.4 否定題最弱） |
| 篩選條件：酒精度上限、官方裝瓶、產地（從酒名解析） | 待評估（§7.5 影響最大） |
| 語意模糊、資訊缺口（§7.6 A–G） | 後續優化 |
| 補清洗規則（約 160 筆非威士忌） | 暫不做 |
| 指名酒款時排除同品牌 | 待評估 |
| rerank 分數門檻（< 1 偏勉強） | 待評估 |
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
