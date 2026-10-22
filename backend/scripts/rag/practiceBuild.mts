/**
 * Practice, step 1: embed the first 2000 chunks and save them to a local file.
 *
 *   npx tsx scripts/rag/practiceBuild.mts
 *
 * Reads output/chunks.jsonl (made by `npm run rag:chunks`) and writes
 * output/practice-vectors.json. Chunks already in that file keep their vector,
 * so only the new ones are sent to OpenAI. Nothing goes to the database.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { embedTexts } from '../../src/services/openaiEmbedder.ts'
import type { ChunkLine } from './buildChunks.mts'

const HOW_MANY = 5000

/** OpenAI caps one request; 100 chunks (about 25,000 tokens) stays well under it. */
const BATCH_SIZE = 100

const CHUNKS_PATH = join(import.meta.dirname, 'output/chunks.jsonl')
const OUTPUT_PATH = join(import.meta.dirname, 'output/practice-vectors.json')

// 1. Read chunks.jsonl and keep the first HOW_MANY lines.
const allLines = readFileSync(CHUNKS_PATH, 'utf8').trim().split('\n')
const chunks: ChunkLine[] = []
for (let i = 0; i < HOW_MANY; i++) {
  chunks.push(JSON.parse(allLines[i]))
}

// 2. Load the vectors we already have, so we don't pay for them twice.
const savedVectors = new Map<string, number[]>()
if (existsSync(OUTPUT_PATH)) {
  const saved = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'))
  for (const item of saved) {
    savedVectors.set(item.whiskyId, item.embedding)
  }
}

// 3. Find the chunks that still need a vector.
const missing: ChunkLine[] = []
for (const chunk of chunks) {
  if (!savedVectors.has(chunk.whiskyId)) {
    missing.push(chunk)
  }
}
console.log('Already embedded: ' + (chunks.length - missing.length))
console.log('To embed now:     ' + missing.length)

// Writes every chunk that has a vector, in chunks.jsonl order, in a readable layout:
// one block per whisky, with the 1536 numbers on a single line.
function save() {
  const blocks: string[] = []
  for (const chunk of chunks) {
    const vector = savedVectors.get(chunk.whiskyId)
    if (!vector) {
      continue
    }
    const withoutVector = JSON.stringify(
      { whiskyId: chunk.whiskyId, name: chunk.name, text: chunk.text, embedding: 'VECTOR' },
      null,
      2,
    )
    blocks.push(withoutVector.replace('"VECTOR"', JSON.stringify(vector)))
  }
  writeFileSync(OUTPUT_PATH, '[\n' + blocks.join(',\n') + '\n]\n')
  return blocks.length
}

// 4. Send the missing texts to OpenAI 100 at a time, saving after every batch,
//    so a failure halfway loses at most one batch and a rerun carries on from there.
for (let start = 0; start < missing.length; start = start + BATCH_SIZE) {
  const batch = missing.slice(start, start + BATCH_SIZE)

  const texts: string[] = []
  for (const chunk of batch) {
    texts.push(chunk.text)
  }

  const vectors = await embedTexts(texts)

  for (let i = 0; i < batch.length; i++) {
    savedVectors.set(batch[i].whiskyId, vectors[i])
  }

  const saved = save()
  console.log('Batch done: ' + (start + batch.length) + ' / ' + missing.length + '  (file now has ' + saved + ')')
}

// 5. Final save (also covers the case where nothing was missing).
const total = save()
console.log('Saved ' + total + ' chunks with vectors to ' + OUTPUT_PATH)
