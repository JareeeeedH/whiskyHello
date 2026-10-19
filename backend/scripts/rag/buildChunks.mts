/**
 * Stage one of the RAG build: Static Dataset → chunks.jsonl, with no paid API calls.
 *
 *   npm run rag:chunks
 *
 * Writes one JSON object per line to scripts/rag/output/chunks.jsonl (git-ignored) and
 * prints a report, so the chunks can be checked by hand before any embedding is paid for.
 * See WHISKY_RAG_SPEC.md §6.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { buildChunk, type RawWhiskyRecord, type SkipReason, type WhiskyChunk } from './chunk.mts'

const DATASET_PATH = join(import.meta.dirname, '../../../frontend/src/data/raw/whiskyDataset.json')
const OUTPUT_PATH = join(import.meta.dirname, 'output/chunks.jsonl')

/** One line of chunks.jsonl. `sourceHash` lets stage two skip chunks that are already embedded. */
export interface ChunkLine extends WhiskyChunk {
  sourceHash: string
}

export function toChunkLine(chunk: WhiskyChunk): ChunkLine {
  return { ...chunk, sourceHash: createHash('sha256').update(chunk.text).digest('hex') }
}

function percentile(sorted: number[], fraction: number): number {
  return sorted[Math.floor(fraction * (sorted.length - 1))] ?? 0
}

function main(): void {
  const records = JSON.parse(readFileSync(DATASET_PATH, 'utf8')) as RawWhiskyRecord[]

  const lines: ChunkLine[] = []
  const skipped: { whiskyId?: string; reason: SkipReason }[] = []
  for (const record of records) {
    const result = buildChunk(record)
    if (result.status === 'ok') {
      lines.push(toChunkLine(result.chunk))
    } else {
      skipped.push({ whiskyId: result.whiskyId, reason: result.reason })
    }
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, lines.map((line) => JSON.stringify(line)).join('\n') + '\n')

  const lengths = lines.map((line) => line.text.length).sort((a, b) => a - b)
  const nameCounts = new Map<string, number>()
  for (const line of lines) {
    nameCounts.set(line.name, (nameCounts.get(line.name) ?? 0) + 1)
  }
  const repeatedNames = [...nameCounts.values()].filter((count) => count > 1).length

  console.log(`Records read:      ${records.length}`)
  console.log(`Chunks written:    ${lines.length} → ${relative(process.cwd(), OUTPUT_PATH)}`)
  console.log(`Skipped:           ${skipped.length}`)
  for (const item of skipped) {
    console.log(`  - id ${item.whiskyId ?? '(none)'}: ${item.reason}`)
  }
  console.log(`Without points:    ${lines.filter((line) => line.points === undefined).length}`)
  console.log(`Repeated names:    ${repeatedNames}`)
  console.log(
    `Chunk length:      median ${percentile(lengths, 0.5)}, 90% ≤ ${percentile(lengths, 0.9)}, ` +
      `max ${lengths.at(-1) ?? 0} characters`,
  )
}

main()
