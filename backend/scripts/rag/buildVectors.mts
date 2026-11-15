/**
 * Build the vector store in MongoDB: embed every chunk and save it to the whiskychunks collection.
 *
 *   npm run rag:build
 *
 * Reads output/chunks.jsonl (made by `npm run rag:chunks`). Unchanged chunks (same sourceHash)
 * are skipped, and whiskies no longer in the file are deleted. Ends by creating the Atlas
 * Vector Search index if it is missing and waiting until it can answer searches.
 * See WHISKY_RAG_SPEC.md §6.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import mongoose from 'mongoose'
import { connectDatabase } from '../../src/config/db.ts'
import { VECTOR_INDEX_DEFINITION, VECTOR_INDEX_NAME, WhiskyChunk } from '../../src/models/WhiskyChunk.ts'
import { EMBEDDING_MODEL, embedTexts } from '../../src/services/openaiEmbedder.ts'
import type { ChunkLine } from './buildChunks.mts'

/** OpenAI caps one request; 100 chunks (about 25,000 tokens) stays well under it. */
const BATCH_SIZE = 100
const CHUNKS_PATH = join(import.meta.dirname, 'output/chunks.jsonl')

// 1. Read the whole file and split it into lines (one chunk per line).
const allLines = readFileSync(CHUNKS_PATH, 'utf8').trim().split('\n')

// 2. Turn every line into an object.
const chunks: ChunkLine[] = []
for (const line of allLines) {
  chunks.push(JSON.parse(line))
}

// 3. Print a few things to check.
const first = chunks[0]
const last = chunks[chunks.length - 1]
console.log('Chunks in file:  ' + allLines.length)
console.log('Chunks to build: ' + chunks.length)
console.log('First: ' + first.whiskyId + '  ' + first.name)
console.log('Last:  ' + last.whiskyId + '  ' + last.name)

// 4. Connect to MongoDB (the same database the backend uses, from .env).
await connectDatabase()

// Wait until Mongoose has built the indexes from the model (whiskyId + embeddingModel, unique).
await WhiskyChunk.init()

// 5. Delete whiskies that are no longer in the file (for example, removed by cleaning).
const currentIds: string[] = []
for (const chunk of chunks) {
  currentIds.push(chunk.whiskyId)
}
const removed = await WhiskyChunk.deleteMany({
  embeddingModel: EMBEDDING_MODEL,
  whiskyId: { $nin: currentIds },
})
console.log('Removed (no longer in file): ' + removed.deletedCount)

// 6. Ask the database what it already has for this model: whiskyId → sourceHash.
const saved = await WhiskyChunk.find(
  { embeddingModel: EMBEDDING_MODEL },
  { whiskyId: 1, sourceHash: 1 },
).lean()

const savedHashes = new Map<string, string>()
for (const item of saved) {
  savedHashes.set(item.whiskyId, item.sourceHash)
}

// 7. A chunk needs building when it is not saved yet, or its text changed (different hash).
const missing: ChunkLine[] = []
let changed = 0
for (const chunk of chunks) {
  const savedHash = savedHashes.get(chunk.whiskyId)
  if (savedHash === undefined) {
    missing.push(chunk)
  } else if (savedHash !== chunk.sourceHash) {
    missing.push(chunk)
    changed++
  }
}
console.log('Already in database: ' + saved.length)
console.log('To build now:        ' + missing.length + '  (of which changed: ' + changed + ')')

// 8. Save the missing chunks 100 at a time, right away after each batch,
//    so a failure halfway loses at most one batch and a rerun carries on from there.
let embedded = 0
for (let start = 0; start < missing.length; start = start + BATCH_SIZE) {
  const batch = missing.slice(start, start + BATCH_SIZE)

  const texts: string[] = []
  for (const chunk of batch) {
    texts.push(chunk.text)
  }
  // embedTexts already checks: one vector per text, in order, 1536 numbers each.
  const vectors = await embedTexts(texts)
  embedded = embedded + batch.length

  // One write per chunk: update it if this whisky + model is saved already, otherwise insert it.
  const writes = []
  for (let i = 0; i < batch.length; i++) {
    const chunk = batch[i]

    // Some whiskies have no readable score: remove any old one instead of saving an empty value.
    let update
    if (chunk.points === undefined) {
      update = {
        $set: { name: chunk.name, text: chunk.text, sourceHash: chunk.sourceHash, embedding: vectors[i] },
        $unset: { points: '' as const },
      }
    } else {
      update = {
        $set: {
          name: chunk.name,
          points: chunk.points,
          text: chunk.text,
          sourceHash: chunk.sourceHash,
          embedding: vectors[i],
        },
      }
    }

    writes.push({
      updateOne: {
        filter: { whiskyId: chunk.whiskyId, embeddingModel: EMBEDDING_MODEL },
        update: update,
        upsert: true,
      },
    })
  }
  await WhiskyChunk.bulkWrite(writes)

  console.log('Batch done: ' + (start + batch.length) + ' / ' + missing.length)
}

console.log('Embedded by OpenAI:   ' + embedded)

const total = await WhiskyChunk.countDocuments({ embeddingModel: EMBEDDING_MODEL })
console.log('Now in database: ' + total)

// 9. Make sure the Atlas Vector Search index exists; $vectorSearch fails without it.
const existing = await WhiskyChunk.collection.listSearchIndexes(VECTOR_INDEX_NAME).toArray()
if (existing.length === 0) {
  await WhiskyChunk.collection.createSearchIndex({
    name: VECTOR_INDEX_NAME,
    type: 'vectorSearch',
    definition: VECTOR_INDEX_DEFINITION,
  })
  console.log('Vector index created: ' + VECTOR_INDEX_NAME)
} else {
  console.log('Vector index already exists: ' + VECTOR_INDEX_NAME)
}

// 10. Wait until Atlas has built the index in the background and it can answer searches.
let queryable = false
while (!queryable) {
  // Atlas returns `status` and `queryable`; the driver's type only lists `name`.
  const indexes = (await WhiskyChunk.collection.listSearchIndexes(VECTOR_INDEX_NAME).toArray()) as {
    status?: string
    queryable?: boolean
  }[]
  const index = indexes[0]
  queryable = index?.queryable === true
  console.log('Vector index status: ' + (index?.status ?? 'unknown'))
  if (!queryable) {
    await new Promise((resolve) => setTimeout(resolve, 10000))
  }
}

// 11. Disconnect, or the script never ends.
await mongoose.disconnect()
console.log('Disconnected')
