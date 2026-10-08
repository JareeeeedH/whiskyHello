import { readFileSync } from 'node:fs'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'
import { canonicalUrl } from './src/utils/pageMeta.ts'
import { normalizeWhiskyDataset } from './src/utils/whiskyNormalizer.ts'

/** Public pages worth indexing; whisky detail pages are added from the dataset. */
const SITEMAP_STATIC_PATHS = ['/', '/whiskies', '/sommelier', '/auctions']

function sitemapPlugin(): Plugin {
  return {
    name: 'whiskyhello-sitemap',
    apply: 'build',
    generateBundle() {
      const dataset = JSON.parse(
        readFileSync(new URL('./src/data/raw/whiskyDataset.json', import.meta.url), 'utf8'),
      )
      const whiskyPaths = normalizeWhiskyDataset(dataset).map((whisky) => `/whiskies/${whisky.id}`)
      const urls = [...new Set([...SITEMAP_STATIC_PATHS, ...whiskyPaths])]
        .map((path) => `  <url><loc>${canonicalUrl(path)}</loc></url>`)
        .join('\n')

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
    },
  }
}

/**
 * Base path:
 * - Vercel / local default → `/`
 * - GitHub Pages → `/whiskyHello/` via `--mode gh-pages` or VITE_BASE_PATH
 */
export default defineConfig(({ mode }) => {
  const base =
    process.env.VITE_BASE_PATH ??
    (mode === 'gh-pages' ? '/whiskyHello/' : '/')

  return {
    base,
    plugins: [vue(), sitemapPlugin()],
  }
})
