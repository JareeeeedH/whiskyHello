/**
 * The bottle's name without the bracket details, e.g.
 * "Lagavulin 16 yo (43%, OB, +/- 2013)" → "lagavulin 16 yo".
 * Bottlings of the same whisky from different years share this name.
 */
export function baseWhiskyName(name: string): string {
  return name.split('(')[0].trim().toLowerCase()
}

/**
 * Keeps only the first item for each base name. Search results come best first,
 * so the closest bottling of each whisky is the one kept.
 */
export function dedupeByBaseName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const kept: T[] = []
  for (const item of items) {
    const key = baseWhiskyName(item.name)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    kept.push(item)
  }
  return kept
}
