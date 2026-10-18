# WhiskyHello RAG Spec（筆記）

資料來源：`WhiskyHello/frontend/src/data/raw/whiskyDataset.json`  
約 17k 筆；每筆一瓶、一篇 `NOTE`（WhiskyFun 風格 critic tasting note）。

---

## 1. 資料形狀

每筆欄位：`id` · `NAME` · `NOTE` · `SCORE` · `IMAGE_PATH`

`NOTE` = 整篇字串，常見結構：

- 可選：開頭心得（無標籤）
- `Colour:` / `Nose:` / `Mouth:`（或 Palate/Taste）/ `Finish:` / `Comments:`

`SCORE`（如 `SGP:551 - 93 points`）≠ 向量相似度分數。

前端 `notes-*.json` 是懶載入切檔，**不是** RAG chunk。

---

## 2. Chunk 規則

**一瓶 → 最多 3 個 chunk**（缺段則少）：

| Chunk | 內容 |
|-------|------|
| `nose` | Nose 段落 |
| `mouth` | Mouth / Palate / Taste |
| `comments` | 開頭心得（若有）+ Comments，合併為一 |

不切：`Colour`（口味問答幫助小）  
可選日後加：`Finish`（MVP 可略或併 mouth）

**Embed 正文格式**（建議）：

```text
{NAME} | Nose: {text}
{NAME} | Mouth: {text}
{NAME} | Intro: {intro} Comments: {comments}   # 無 intro 則僅 Comments:
```

- 原樣進 embed，不先做關鍵字刪除／清詞（驗收後再優化）
- Metadata 另存：`id` · `name` · `score` · `section`

---

## 3. 建庫流程（離線）

1. 讀 raw JSON  
2. 依標籤拆 `NOTE` → 3 類 chunk  
3. 每個 chunk 呼叫 embedding API → 向量  
4. 儲存：`vector` + `text` + `metadata`  

規模約：17k × 3 ≈ 5 萬向量。建議先抽 200–500 瓶驗證，再上全庫。

---

## 4. 問答流程（線上）

1. 使用者問題 → **同一套** embedding 模型 → query 向量  
2. 與所有 chunk 做 cosine 相似度 → **top-k（建議 5）**  
3. 彙整成酒款候選（見 §5）  
4. 將命中原文（可含酒名、section、score）塞進 prompt  
5. Chat LLM 作答；**禁止捏造未檢索到的酒款／風味**

角色分工：

- Embedding + cosine = 找對段落  
- Chat LLM = 根據段落組織回答（不是用 QKV 做檢索）

---

## 5. 排名／平手規則

主訊號：向量相似度。

加權（由強到弱）：

1. 同瓶（同 `id`）在 top-k 出現多次 → 強加分／提高信心  
2. 每瓶可用「最佳 chunk 分」或「同分加總」排瓶  
3. 同酒廠 → **弱訊號**（風格簇）；勿直接改推該廠任意一瓶  

分數相近很常見（評論用字重疊）。寧可回傳 2–3 瓶候選 + 原文摘句，硬選唯一冠軍。

---

## 6. 各 Chunk 用途

| Chunk | 適合回答 | 不適合 |
|-------|----------|--------|
| nose | 鼻香、氣味關鍵字 | 總評態度 |
| mouth | 口感、味道、結構 | 包裝八卦 |
| comments | 總評、定位、值不值得、比較句 | 細緻香氣清單（雜訊較多，可接受） |

口味檢索主力 = nose + mouth；comments 把雜訊集中，不當口味主力。

---

## 7. 已知注意點

- **中英**：NOTE 多英文；中文問題可先譯英再 embed，或接受檢索變弱  
- **雜訊**：單段內少量語氣詞可忽略；不靠 embed「自動忽略廢話」  
- **準度**：切法／top-k／彙整靠工程師 + 題庫驗收，不是「模型夠強就好」  
- **可追溯**：回答應能對回命中的瓶、section、原文  

---

## 8. MVP 驗收

準備 15–20 題（泥煤／果香／藥感／海岸／總評類等），檢查：

- top 命中 section 是否合理  
- 彙整後推薦瓶是否可接受  
- LLM 是否有引用外幻覺  

---

## 9. 先不做

- 等長 A/B/C/D 硬切  
- 建庫前大量清詞規則  
- 複雜 rerank / 酒廠規則引擎  
- 把前端 note 檔案切分當成 RAG chunk  
