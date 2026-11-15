import type { PreTrainedModel, PreTrainedTokenizer } from '@huggingface/transformers' with {
  'resolution-mode': 'import',
}

/**
 * Cross-encoder that reads the question and one tasting note together and scores how well
 * they match; English only. Downloaded from Hugging Face on first use (about 23 MB).
 * See WHISKY_RAG_SPEC.md §7.2.
 */
const RERANK_MODEL = 'Xenova/ms-marco-MiniLM-L-6-v2'

/** The model reads at most this many tokens; longer notes lose their end (Finish, Comments). */
const MAX_TOKENS = 512

interface Reranker {
  tokenizer: PreTrainedTokenizer
  model: PreTrainedModel
}

let loading: Promise<Reranker> | null = null

/** Loads the model once; every caller waits on the same load. A failed load is retried next time. */
function getReranker(): Promise<Reranker> {
  if (!loading) {
    loading = (async () => {
      // The package is ESM only and the backend compiles to CommonJS, so it is loaded with import().
      const { AutoModelForSequenceClassification, AutoTokenizer } = await import('@huggingface/transformers')
      const tokenizer = await AutoTokenizer.from_pretrained(RERANK_MODEL)
      // q8 (8-bit) is smaller and faster than fp32 and ranks almost the same.
      const model = await AutoModelForSequenceClassification.from_pretrained(RERANK_MODEL, { dtype: 'q8' })
      return { tokenizer, model }
    })()
    loading.catch(() => {
      loading = null
    })
  }
  return loading
}

/** Loads the model ahead of the first search, so that search does not wait for the download. */
export async function loadReranker(): Promise<void> {
  await getReranker()
}

/** Scores one note against the question; higher means a better match. */
async function scoreText(reranker: Reranker, question: string, text: string): Promise<number> {
  const inputs = reranker.tokenizer([question], {
    text_pair: [text],
    padding: true,
    truncation: true,
    max_length: MAX_TOKENS,
  })
  const { logits } = await reranker.model(inputs)
  return (logits.data as Float32Array)[0]
}

/**
 * Reorders the candidates by how well their `text` matches the question and returns the best `count`.
 * Notes are scored one at a time: scoring them together pads every note to the longest one,
 * which is slower and needs far more memory.
 */
export async function rerankCandidates<T extends { text: string }>(
  question: string,
  candidates: T[],
  count: number,
): Promise<T[]> {
  const reranker = await getReranker()

  const scored: { item: T; score: number }[] = []
  for (const item of candidates) {
    scored.push({ item, score: await scoreText(reranker, question, item.text) })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, count).map((entry) => entry.item)
}
