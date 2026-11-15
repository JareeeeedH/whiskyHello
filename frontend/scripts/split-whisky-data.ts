import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cleanWhiskyDataset } from '../src/utils/whiskyClean.ts'
import { normalizeId, normalizeNote } from '../src/utils/whiskyNormalizer.ts'
import { whiskyNoteChunkName } from '../src/utils/whiskyNoteChunk.ts'

/**
 * Cleans the raw whisky dataset (whiskyClean.ts), then splits it into a light index (no NOTE)
 * and small note chunks, so pages that only need names/scores/images don't download every
 * tasting note. The raw dataset stays untouched; output goes to src/data/generated (git-ignored),
 * including whiskyExcluded.json: the dropped records and why.
 */
const dataDir = resolve(import.meta.dirname, '..', 'src', 'data')
const outDir = resolve(dataDir, 'generated')
const notesDir = resolve(outDir, 'notes')

const rawList: Record<string, unknown>[] = JSON.parse(
  readFileSync(resolve(dataDir, 'raw', 'whiskyDataset.json'), 'utf8'),
)

const { kept, excluded } = cleanWhiskyDataset(rawList)

// id first so the file reads easily; the raw records list it last.
const index = kept.map(({ id, NOTE: _note, ...rest }) => ({ id, ...rest }))
const chunks = new Map<string, Record<string, string>>()

for (const record of kept) {
  const id = normalizeId(record.id)
  const note = normalizeNote(record.NOTE)
  if (!id || note === undefined) continue
  const name = whiskyNoteChunkName(id)
  const chunk = chunks.get(name) ?? {}
  chunk[id] = note
  chunks.set(name, chunk)
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(notesDir, { recursive: true })
// Indented for reading; Vite minifies the JSON when it bundles it, so pages load the same size.
writeFileSync(resolve(outDir, 'whiskyIndex.json'), JSON.stringify(index, null, 2))
writeFileSync(resolve(outDir, 'whiskyExcluded.json'), JSON.stringify(excluded, null, 2))
for (const [name, chunk] of chunks) {
  writeFileSync(resolve(notesDir, `${name}.json`), JSON.stringify(chunk))
}

console.log(`Whisky data: ${rawList.length} raw, ${kept.length} kept, ${excluded.length} excluded`)
const byReason = new Map<string, typeof excluded>()
for (const item of excluded) {
  byReason.set(item.reason, [...(byReason.get(item.reason) ?? []), item])
}
for (const [reason, items] of byReason) {
  console.log(`  ${reason}: ${items.length}`)
  for (const item of items.slice(0, 5)) {
    console.log(`    #${String(item.id)} ${item.name.slice(0, 70)}  [${item.matched ?? ''}]`)
  }
}
console.log(`Whisky data split: ${index.length} index rows, ${chunks.size} note chunks`)
