import type { SommelierInput, TasteKey } from '../types/sommelier'

/** Each taste in the plain English that tasting notes use. */
const TASTE_WORDS: Record<TasteKey, string> = {
  fruit: 'fruity',
  sweet: 'sweet, honey',
  floral: 'floral',
  maltGrain: 'malty, grainy',
  nutty: 'nutty',
  chocolateCoffee: 'chocolate, coffee',
  spice: 'spicy',
  oak: 'oaky, woody',
  peat: 'peaty',
  smoke: 'smoky',
}

/** 1–3 a hint of, 4–7 noticeable, 8–10 dominant. */
function describeTasteLevel(score: number): string {
  if (score <= 3) {
    return 'a hint of'
  }
  if (score <= 7) {
    return 'noticeable'
  }
  return 'dominant'
}

/** 1–3 light, 4–7 medium, 8–10 full. */
function describeBody(score: number): string {
  if (score <= 3) {
    return 'Light-bodied'
  }
  if (score <= 7) {
    return 'Medium-bodied'
  }
  return 'Full-bodied'
}

/** Joins words as "a, b and c". */
function joinWithAnd(words: string[]): string {
  if (words.length <= 1) {
    return words.join('')
  }
  const allButLast = words.slice(0, words.length - 1)
  return allButLast.join(', ') + ' and ' + words[words.length - 1]
}

/**
 * Turns the Sommelier taste and body answers into one English sentence for embedding, e.g.
 * "Light-bodied whisky with a hint of floral notes and noticeable malty, grainy notes."
 * Occasion and budget are left out: tasting notes never mention them, and they blur the flavours.
 */
export function buildEmbeddingSentence(input: SommelierInput): string {
  const tastes: string[] = []
  for (const key of Object.keys(input.taste) as TasteKey[]) {
    const score = input.taste[key]
    if (score === undefined) {
      continue
    }
    tastes.push(describeTasteLevel(score) + ' ' + TASTE_WORDS[key] + ' notes')
  }

  return describeBody(input.style.body) + ' whisky with ' + joinWithAnd(tastes) + '.'
}
