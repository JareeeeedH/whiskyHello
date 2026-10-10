/** The drop rests at this fraction of the viewport height while the page scrolls. */
export const DROP_REST_RATIO = 0.36
/** The drop falls once the glass's liquid surface rises above this fraction of the viewport. */
export const FALL_AT_RATIO = 0.72
/** Scrolling back until the surface sits below this fraction brings the drop back. */
export const RESET_AT_RATIO = 0.9
export const FALL_MS = 420

export type DropPhase = 'following' | 'falling' | 'landed'

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * The gap between FALL_AT_RATIO and RESET_AT_RATIO keeps the drop from flickering at the threshold.
 * Reaching the page bottom also counts, since on tall screens the glass may never rise past the fall line.
 */
export function nextDropPhase(
  phase: DropPhase,
  surfaceY: number,
  viewportHeight: number,
  atPageBottom = false,
): DropPhase {
  if (phase === 'following') {
    return atPageBottom || surfaceY < viewportHeight * FALL_AT_RATIO ? 'falling' : 'following'
  }
  return !atPageBottom && surfaceY > viewportHeight * RESET_AT_RATIO ? 'following' : phase
}

/** Gravity-like ease-in from where the drop rested to the liquid surface. */
export function fallPosition(fromY: number, toY: number, elapsedRatio: number): number {
  const t = clamp01(elapsedRatio)
  return fromY + (toY - fromY) * t * t
}

/** Hidden over the hero, then fades in across the next quarter of a screen. */
export function dropOpacity(scrollY: number, viewportHeight: number): number {
  return clamp01((scrollY - viewportHeight * 0.25) / (viewportHeight * 0.25))
}
