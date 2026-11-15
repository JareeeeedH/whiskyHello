import { VECTOR_INDEX_NAME, WhiskyChunk } from '../models/WhiskyChunk'
import { embedText } from './openaiEmbedder'

/** One search result: the whisky and how close it is to the question (cosine, 0–1). */
export interface SearchResult {
  whiskyId: string
  name: string
  text: string
  score: number
}

/**
 * How many nearby vectors Atlas looks at for every result it returns.
 * More looks wider and finds closer matches, but is slower; 20 is Atlas's suggested start.
 */
const CANDIDATES_PER_RESULT = 20

/**
 * Turns the question into a vector and asks MongoDB (Atlas Vector Search)
 * for the `count` closest chunks, highest score first.
 */
export async function searchByFlavour(question: string, count: number): Promise<SearchResult[]> {
  const questionVector = await embedText(question)

  return WhiskyChunk.aggregate<SearchResult>([
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: 'embedding',
        queryVector: questionVector,
        numCandidates: count * CANDIDATES_PER_RESULT,
        limit: count,
      },
    },
    {
      // Leave the 1536 numbers in the database; send back only what callers use.
      $project: {
        _id: 0,
        whiskyId: 1,
        name: 1,
        text: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ])
}
