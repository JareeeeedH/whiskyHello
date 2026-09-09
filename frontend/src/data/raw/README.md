# Raw Whisky Static Dataset

This directory holds the **preserved raw** WhiskyFun static dataset.

- Source: legacy `whsfun-ui` `src/config/dataList.js` (active runtime dataset)
- Do **not** edit record contents or renumber `id` values
- `id` is the stable key for future `Review.whiskyId`
- Frontend code must consume data via `whiskyService`, not by importing this file in Vue components
