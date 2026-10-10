import type { Directive } from 'vue'
import { revealDelayMs } from '../utils/revealDelay'

let observer: IntersectionObserver | null = null

function getObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed')
          observer?.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.1, rootMargin: '0px 0px -8% 0px' },
  )
  return observer
}

function canReveal(): boolean {
  return (
    typeof IntersectionObserver !== 'undefined' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * `v-reveal` / `v-reveal="step"`: the element rises in the first time it scrolls
 * into view (styles in style.css). Without IntersectionObserver, or with reduced
 * motion, it is simply shown.
 */
export const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, { value }) {
    if (!canReveal()) {
      return
    }
    el.classList.add('reveal')
    el.style.setProperty('--reveal-delay', `${revealDelayMs(value)}ms`)
    getObserver().observe(el)
  },
  unmounted(el) {
    observer?.unobserve(el)
  },
}
