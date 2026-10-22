import { WhiskyNoteChunk } from '../models/WhiskyNoteChunk'
import { findTopMatches, type SearchItem, type SearchResult } from '../utils/vectorSearch'
import { EMBEDDING_MODEL, embedText } from './openaiEmbedder'

/**
 * The vector store kept in memory: every whisky chunk with its embedding.
 * Filled once by loadVectors() when the server starts; searches read only from here.
 */
let vectors: SearchItem[] = []

/** Reads every chunk for the current embedding model from MongoDB into memory. */
export async function loadVectors() {
  const saved = await WhiskyNoteChunk.find(
    { embeddingModel: EMBEDDING_MODEL },
    { whiskyId: 1, name: 1, text: 1, embedding: 1 },
  ).lean()

  const loaded: SearchItem[] = []
  for (const item of saved) {
    // Copy the numbers into a new array. The array MongoDB hands back keeps every number
    // as a separate object (about 200 MB for 5000 chunks); a fresh array packs them
    // tightly (about 80 MB).
    const embedding: number[] = []
    for (let i = 0; i < item.embedding.length; i++) {
      embedding.push(item.embedding[i])
    }

    loaded.push({
      whiskyId: item.whiskyId,
      name: item.name,
      text: item.text,
      embedding: embedding,
    })
  }

  // Swap in the new list only when it is complete, so a search never sees half of it.
  vectors = loaded
  return vectors.length
}

/** How many chunks are in memory; 0 means search is not ready yet. */
export function countLoadedVectors() {
  return vectors.length
}

/** Turns the question into a vector and returns the `count` closest chunks. */
export async function searchByFlavour(question: string, count: number): Promise<SearchResult[]> {
  const questionVector = await embedText(question)
  return findTopMatches(questionVector, vectors, count)
}
