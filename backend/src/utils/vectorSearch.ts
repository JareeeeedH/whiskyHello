/**
 * Cosine similarity of two vectors: 1 means the same direction (same meaning),
 * 0 means unrelated. Both vectors must have the same length.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length: ' + a.length + ' vs ' + b.length + '.')
  }

  let dot = 0
  let lengthA = 0
  let lengthB = 0

  for (let i = 0; i < a.length; i++) {
    dot = dot + a[i] * b[i]
    lengthA = lengthA + a[i] * a[i]
    lengthB = lengthB + b[i] * b[i]
  }

  // An all-zero vector has no direction, so it matches nothing.
  if (lengthA === 0 || lengthB === 0) {
    return 0
  }

  return dot / (Math.sqrt(lengthA) * Math.sqrt(lengthB))
}

/** One whisky chunk with its vector, as kept in memory for searching. */
export interface SearchItem {
  whiskyId: string
  name: string
  text: string
  embedding: number[]
}

/** One search result: the whisky and how close it is to the question. */
export interface SearchResult {
  whiskyId: string
  name: string
  text: string
  score: number
}

/** Scores every item against the question vector and returns the best `count`, highest first. */
export function findTopMatches(questionVector: number[], items: SearchItem[], count: number): SearchResult[] {
  // 1. Give every item a score.
  const results: SearchResult[] = []
  for (const item of items) {
    const score = cosineSimilarity(questionVector, item.embedding)
    results.push({
      whiskyId: item.whiskyId,
      name: item.name,
      text: item.text,
      score: score,
    })
  }

  // 2. Sort: highest score first.
  results.sort(function (a, b) {
    return b.score - a.score
  })

  // 3. Keep only the first `count` results.
  const top: SearchResult[] = []
  for (let i = 0; i < count && i < results.length; i++) {
    top.push(results[i])
  }
  return top
}
