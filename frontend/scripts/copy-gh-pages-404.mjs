import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * GitHub Pages and Vercel serve 404.html for unknown paths.
 * Copying index.html → 404.html lets the SPA render its Not Found page
 * (Vercel keeps the 404 status; GitHub Pages deep links still load the app).
 */
const distDir = resolve(import.meta.dirname, '..', 'dist')
copyFileSync(resolve(distDir, 'index.html'), resolve(distDir, '404.html'))
console.log('Copied dist/index.html → dist/404.html for SPA 404 fallback')
