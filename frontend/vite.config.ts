import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

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
    plugins: [vue()],
  }
})
