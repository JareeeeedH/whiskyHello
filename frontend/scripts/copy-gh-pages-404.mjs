import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * GitHub Pages serves 404.html for unknown paths.
 * Copying index.html → 404.html lets Vue Router history mode
 * deep links (e.g. /whiskies/:id) load the SPA instead of a hard 404.
 */
const distDir = resolve(import.meta.dirname, '..', 'dist')
copyFileSync(resolve(distDir, 'index.html'), resolve(distDir, '404.html'))
console.log('Copied dist/index.html → dist/404.html for GitHub Pages SPA fallback')
