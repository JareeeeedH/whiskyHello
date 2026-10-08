import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeId, normalizeNote } from '../src/utils/whiskyNormalizer.ts'
import { whiskyNoteChunkName } from '../src/utils/whiskyNoteChunk.ts'

/**
 * Splits the raw whisky dataset into a light index (no NOTE) and small note chunks,
 * so pages that only need names/scores/images don't download every tasting note.
 * The raw dataset stays untouched; output goes to src/data/generated (git-ignored).
 */
const dataDir = resolve(import.meta.dirname, '..', 'src', 'data')
const outDir = resolve(dataDir, 'generated')
const notesDir = resolve(outDir, 'notes')

const rawList: Record<string, unknown>[] = JSON.parse(
  readFileSync(resolve(dataDir, 'raw', 'whiskyDataset.json'), 'utf8'),
)

const index = rawList.map(({ NOTE: _note, ...rest }) => rest)
const chunks = new Map<string, Record<string, string>>()

for (const raw of rawList) {
  const id = normalizeId(raw.id)
  const note = normalizeNote(raw.NOTE)
  if (!id || note === undefined) continue
  const name = whiskyNoteChunkName(id)
  const chunk = chunks.get(name) ?? {}
  chunk[id] = note
  chunks.set(name, chunk)
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(notesDir, { recursive: true })
writeFileSync(resolve(outDir, 'whiskyIndex.json'), JSON.stringify(index))
for (const [name, chunk] of chunks) {
  writeFileSync(resolve(notesDir, `${name}.json`), JSON.stringify(chunk))
}

console.log(`Whisky data split: ${index.length} index rows, ${chunks.size} note chunks`)
