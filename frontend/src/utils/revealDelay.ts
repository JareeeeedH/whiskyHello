const STAGGER_MS = 70
/** Later siblings share the last delay, so a long list never keeps anyone waiting. */
const MAX_STAGGER_STEPS = 5

/** Delay for the n-th item of a group revealed together (see the v-reveal directive). */
export function revealDelayMs(step = 0): number {
  return Math.min(Math.max(0, Math.floor(step)), MAX_STAGGER_STEPS) * STAGGER_MS
}
