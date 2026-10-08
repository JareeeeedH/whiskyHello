/** Number of whisky notes per generated chunk file (see scripts/split-whisky-data.ts). */
export const WHISKY_NOTE_CHUNK_SIZE = 200

/** Shared by the build script and whiskyService so both agree on which chunk holds a note. */
export function whiskyNoteChunkName(id: string): string {
  const numericId = Number(id)
  if (!Number.isInteger(numericId) || numericId < 0) {
    return 'notes-other'
  }
  return `notes-${Math.floor(numericId / WHISKY_NOTE_CHUNK_SIZE)}`
}
