/**
 * Practice, step 2: search the 50 practice chunks by meaning.
 *
 *   npx tsx scripts/rag/practiceSearch.mts "營火煙燻帶海味"
 *
 * Embeds the question, compares it with every saved vector, and prints the top 5.
 * Run practiceBuild.mts first.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { embedText } from '../../src/services/openaiEmbedder.ts'

const TOP = 5
const VECTORS_PATH = join(import.meta.dirname, 'output/practice-vectors.json')

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0
  let lengthA = 0
  let lengthB = 0

  for (let i = 0; i < a.length; i++) {
    dot = dot + a[i] * b[i]
    lengthA = lengthA + a[i] * a[i]
    lengthB = lengthB + b[i] * b[i]
  }

  return dot / (Math.sqrt(lengthA) * Math.sqrt(lengthB))
}

// 1. The question comes from the command line.
const question = process.argv[2]
if (!question) {
  console.log('Please give a question, for example:')
  console.log('  npx tsx scripts/rag/practiceSearch.mts "營火煙燻帶海味"')
  process.exit(1)
}

// 2. Load the 50 saved chunks and their vectors.
const chunks = JSON.parse(readFileSync(VECTORS_PATH, 'utf8'))

// 3. Turn the question into a vector.
const questionVector = await embedText(question)

// 4. Score every chunk against the question.
const results = []
for (const chunk of chunks) {
  results.push({
    name: chunk.name,
    score: cosineSimilarity(questionVector, chunk.embedding),
    text: chunk.text,
  })
}

// 5. Highest score first.
results.sort((a, b) => b.score - a.score)

// 6. Print the top 5.
console.log('Question: ' + question)
console.log()
for (let i = 0; i < TOP; i++) {
  const result = results[i]
  console.log((i + 1) + '. ' + result.score.toFixed(3) + '  ' + result.name)
  // The second line of the chunk is the Nose; show its start as a hint of why it matched.
  const nose = result.text.split('\n')[1] ?? ''
  console.log('   ' + nose.slice(0, 110) + '…')
}
