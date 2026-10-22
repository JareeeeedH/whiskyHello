/**
 * Build the vector store in MongoDB: embed the first HOW_MANY chunks and save them
 * to the whiskynotechunks collection.
 *
 *   npx tsx scripts/rag/buildVectors.mts
 *
 * Reads output/chunks.jsonl (made by `npm run rag:chunks`).
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import mongoose from 'mongoose'
import { connectDatabase } from '../../src/config/db.ts'
import { WhiskyNoteChunk } from '../../src/models/WhiskyNoteChunk.ts'
import { EMBEDDING_MODEL, embedTexts } from '../../src/services/openaiEmbedder.ts'
import type { ChunkLine } from './buildChunks.mts'

const HOW_MANY = 5000

/** OpenAI caps one request; 100 chunks (about 25,000 tokens) stays well under it. */
const BATCH_SIZE = 100
const CHUNKS_PATH = join(import.meta.dirname, 'output/chunks.jsonl')

/** Vectors already made by practiceBuild.mts; reused so we don't pay OpenAI for them again. */
const LOCAL_VECTORS_PATH = join(import.meta.dirname, 'output/practice-vectors.json')

// 1. Read the whole file and split it into lines (one chunk per line).
const allLines = readFileSync(CHUNKS_PATH, 'utf8').trim().split('\n')

// 2. Keep the first HOW_MANY lines, each turned into an object.
const chunks: ChunkLine[] = []
for (let i = 0; i < HOW_MANY; i++) {
  chunks.push(JSON.parse(allLines[i]))
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
await WhiskyNoteChunk.init()

// 5. Ask the database what it already has for this model: whiskyId → sourceHash.
const saved = await WhiskyNoteChunk.find(
  { embeddingModel: EMBEDDING_MODEL },
  { whiskyId: 1, sourceHash: 1 },
).lean()

const savedHashes = new Map<string, string>()
for (const item of saved) {
  savedHashes.set(item.whiskyId, item.sourceHash)
}

// 6. A chunk needs building when it is not saved yet, or its text changed (different hash).
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

// 7. Load the local practice vectors: whiskyId → { text, embedding }.
const localVectors = new Map<string, { text: string; embedding: number[] }>()
if (existsSync(LOCAL_VECTORS_PATH)) {
  const local = JSON.parse(readFileSync(LOCAL_VECTORS_PATH, 'utf8'))
  for (const item of local) {
    localVectors.set(item.whiskyId, { text: item.text, embedding: item.embedding })
  }
}
console.log('Local vectors found: ' + localVectors.size)

// 8. Save the missing chunks 100 at a time, right away after each batch,
//    so a failure halfway loses at most one batch and a rerun carries on from there.
let reused = 0
let embedded = 0
for (let start = 0; start < missing.length; start = start + BATCH_SIZE) {
  const batch = missing.slice(start, start + BATCH_SIZE)

  // Use the local vector when it was made from exactly this text; otherwise ask OpenAI.
  const vectors: number[][] = []
  const needOpenAI: number[] = []
  for (let i = 0; i < batch.length; i++) {
    const local = localVectors.get(batch[i].whiskyId)
    if (local && local.text === batch[i].text) {
      vectors[i] = local.embedding
      reused++
    } else {
      needOpenAI.push(i)
    }
  }

  if (needOpenAI.length > 0) {
    const texts: string[] = []
    for (const i of needOpenAI) {
      texts.push(batch[i].text)
    }
    // embedTexts already checks: one vector per text, in order, 1536 numbers each.
    const newVectors = await embedTexts(texts)
    for (let j = 0; j < needOpenAI.length; j++) {
      vectors[needOpenAI[j]] = newVectors[j]
    }
    embedded = embedded + needOpenAI.length
  }

  // One write per chunk: update it if this whisky + model is saved already, otherwise insert it.
  const writes = []
  for (let i = 0; i < batch.length; i++) {
    const chunk = batch[i]
    writes.push({
      updateOne: {
        filter: { whiskyId: chunk.whiskyId, embeddingModel: EMBEDDING_MODEL },
        update: {
          $set: {
            name: chunk.name,
            text: chunk.text,
            sourceHash: chunk.sourceHash,
            embedding: vectors[i],
          },
        },
        upsert: true,
      },
    })
  }
  await WhiskyNoteChunk.bulkWrite(writes)

  console.log('Batch done: ' + (start + batch.length) + ' / ' + missing.length)
}

console.log('Reused local vectors: ' + reused)
console.log('Embedded by OpenAI:   ' + embedded)

const total = await WhiskyNoteChunk.countDocuments({ embeddingModel: EMBEDDING_MODEL })
console.log('Now in database: ' + total)

// 9. Disconnect, or the script never ends.
await mongoose.disconnect()
console.log('Disconnected')
