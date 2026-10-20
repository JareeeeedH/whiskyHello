import OpenAI from 'openai'
import { resolveOpenAIConfig } from '../config/env'
import { EMBEDDING_DIMENSIONS } from '../models/WhiskyNoteChunk'

export const EMBEDDING_MODEL = 'text-embedding-3-small'

const createOpenAIClient = () => {
  const config = resolveOpenAIConfig()

  if (!config.apiKey) {
    throw new Error('OpenAI API key is not set in environment variables.')
  }
  return new OpenAI({
    apiKey: config.apiKey,
  })
}

/** One text → one vector. Used for a search question. */
export async function embedText(text: string) {
  const client = createOpenAIClient()
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  })

  const item = response.data[0]

  if (!item) {
    throw new Error('OpenAI returned no embedding.')
  }

  if (item.embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS} numbers but got ${item.embedding.length}.`,
    )
  }

  return item.embedding
}

/** Many texts → many vectors, in the same order. Used when building the chunk store. */
export async function embedTexts(texts: string[]) {
  const client = createOpenAIClient()
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  })

  // Send N texts, get N vectors back.
  if (response.data.length !== texts.length) {
    throw new Error('Sent ' + texts.length + ' texts but got ' + response.data.length + ' embeddings.')
  }

  const vectors: number[][] = []

  for (let i = 0; i < response.data.length; i++) {
    const item = response.data[i]

    // The i-th vector must belong to the i-th text.
    if (item.index !== i) {
      throw new Error('Embeddings came back in the wrong order.')
    }

    if (item.embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error('Expected ' + EMBEDDING_DIMENSIONS + ' numbers but got ' + item.embedding.length + '.')
    }

    vectors.push(item.embedding)
  }

  return vectors
}
