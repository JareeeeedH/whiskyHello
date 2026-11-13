# WhiskyHello 專欄規格書

> 狀態：試行版（2026-11-14）。
> 主規格：`WHISKYHELLO_SPEC.md`。
> 文章由獨立專案 whisky-column-agent 撰寫，本文件只規範 WhiskyHello 端的資料與顯示。

---

## 1. 目的

站內的威士忌知識文章（入門、比較、喝法等），帶來搜尋流量，並讓讀者從首頁進入。

- 不建立 MongoDB Model 與 API；資料為前端靜態檔
- 與新聞不同：新聞連到外部原文，專欄是站內文章頁

---

## 2. 資料

- 檔案：`frontend/src/data/columns.json`（以此檔為準；不放 `generated/`，該資料夾不 commit 且每次 build 會清空）
- 型別：`frontend/src/types/column.ts`
- 由 whisky-column-agent 的 `article.md` 轉換後複製過來；搬移流程待定

| 欄位 | 內容 |
|---|---|
| `id` | 英文 slug，用於網址；上線後不改 |
| `title` | 標題 |
| `type` | `recommendation`、`comparison`、`guide`、`review`、`distillery`、`howto` |
| `description` | 一句摘要（50–80 字），卡片與 SEO 共用 |
| `publishedAt` | ISO 8601 |
| `readingMinutes` | 閱讀分鐘數 |
| `cover` | 選填：`imageUrl`、`sourceUrl`、`credit` |
| `body` | 區塊陣列：`heading`、`paragraph`（可含 `**粗體**`） |
| `sources` | `title`、`url` |

- 內文不含來源編號 `[1]`，不顯示 AI 輔助聲明
- 封面直接連結原網站圖片（不下載），文章頁標示圖片來源；載入失敗時隱藏

---

## 3. 頁面

| 頁面 | 路由 | 內容 |
|---|---|---|
| 首頁區塊 | `/` | 新聞之後、侍酒師之前；最新 3 篇：左 1 大卡（含摘要）、右 2 小卡 |
| 列表頁 | `/columns` | 全部文章，依發布時間新到舊，可依類型篩選 |
| 文章頁 | `/columns/:id` | 類型、標題、日期與閱讀時間、封面、內文、資料來源（預設收合）、延伸閱讀 3 篇 |

- 導覽列不加專欄入口
- 內文以 Vue 模板輸出，不使用 `v-html`
- 找不到 id：顯示找不到文章，使用 `NOT_FOUND_META`

---

## 4. SEO

- 列表頁：固定 title、description
- 文章頁：title 為「文章標題｜WhiskyHello」，description 為 `description`
- sitemap：build 時加入 `/columns` 與每篇文章頁
- Vercel rewrites 加入 `/columns`、`/columns/:id`

---

## 5. 待定

- 從 whisky-column-agent 搬移資料的流程
- 圖片版權：標示來源不等於授權，收到要求即移除
- 文章內酒款連結到酒款頁、文章頁的侍酒師入口
