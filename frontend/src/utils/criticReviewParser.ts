/**
 * Presentation-only parser for critic reviews (Static Dataset NOTE and its AI
 * translation). Splits a plain-text review into tasting sections for display;
 * the source string itself is never modified.
 */

export type CriticSectionKey = 'colour' | 'nose' | 'palate' | 'finish' | 'comments' | 'unknown'

export interface CriticReviewSection {
  key: CriticSectionKey
  /** Display label controlled by the frontend; empty for `unknown`. */
  label: string
  labelEn: string
  /** Qualifier written next to the label in the review, e.g. "(neat)" or "（純飲）". */
  qualifier: string
  content: string
}

type KnownSectionKey = Exclude<CriticSectionKey, 'unknown'>

const SECTION_LABELS: Record<KnownSectionKey, { label: string; labelEn: string }> = {
  colour: { label: '顏色', labelEn: 'Colour' },
  nose: { label: '香氣', labelEn: 'Nose' },
  palate: { label: '口感', labelEn: 'Palate' },
  finish: { label: '餘韻', labelEn: 'Finish' },
  comments: { label: '評論', labelEn: 'Comments' },
}

const LABEL_KEYS: Record<string, KnownSectionKey> = {
  colour: 'colour',
  color: 'colour',
  顏色: 'colour',
  色澤: 'colour',
  nose: 'nose',
  香氣: 'nose',
  mouth: 'palate',
  palate: 'palate',
  taste: 'palate',
  口感: 'palate',
  finish: 'finish',
  餘韻: 'finish',
  尾韻: 'finish',
  comments: 'comments',
  comment: 'comments',
  評論: 'comments',
  評語: 'comments',
}

const LABEL = String.raw`(?:colou?r|nose|mouth|palate|taste|finish|comments?)\b|顏色|色澤|香氣|口感|餘韻|尾韻|評論|評語`
const QUALIFIER = String.raw`[ \t]*[(（][^()（）\n]{1,60}[)）]`
/**
 * A label only starts a section at the start of the text, a line or a sentence,
 * or right after another label's colon (an empty section, e.g. "Colour: Nose: …").
 */
const SENTENCE_START = String.raw`(?<=(?:^|[\n.!?…;:。！？；：」』”’"')）\]])[ \t]*)`
const LINE_START = String.raw`(?<=(?:^|\n)[ \t]*)`
const LINE_END = String.raw`[ \t]*(?=\r?\n)`

/**
 * Either "Label:" / "標籤：" at a sentence start, or a label alone on its own line
 * (the block format of AI translations).
 */
const SECTION_LABEL = new RegExp(
  `${SENTENCE_START}(?<label>${LABEL})(?<qualifier>${QUALIFIER})?[ \\t]*[:：]` +
    `|${LINE_START}(?<lineLabel>${LABEL})(?<lineQualifier>${QUALIFIER})?${LINE_END}`,
  'giu',
)

/** Fewer distinct sections than this is not treated as a reliable structure. */
const MIN_DISTINCT_SECTIONS = 2

function sectionKey(match: RegExpMatchArray): KnownSectionKey {
  const label = (match.groups?.label ?? match.groups?.lineLabel ?? '').toLowerCase()
  return LABEL_KEYS[label]
}

/**
 * Returns the review split into sections, or `null` when no reliable structure
 * is found, in which case the caller shows the original text unchanged. Text
 * before the first label is kept as an `unknown` section; only the label words
 * themselves are replaced by the frontend label.
 */
export function parseCriticReview(text: string): CriticReviewSection[] | null {
  const matches = [...text.matchAll(SECTION_LABEL)]
  if (new Set(matches.map(sectionKey)).size < MIN_DISTINCT_SECTIONS) {
    return null
  }

  const sections: CriticReviewSection[] = []
  const intro = text.slice(0, matches[0].index).trim()
  if (intro) {
    sections.push({ key: 'unknown', label: '', labelEn: '', qualifier: '', content: intro })
  }

  matches.forEach((match, index) => {
    const key = sectionKey(match)
    const start = (match.index ?? 0) + match[0].length
    const end = matches[index + 1]?.index ?? text.length
    sections.push({
      key,
      ...SECTION_LABELS[key],
      qualifier: (match.groups?.qualifier ?? match.groups?.lineQualifier ?? '').trim(),
      content: text.slice(start, end).trim(),
    })
  })

  return sections
}

/** Splits section content on blank lines; single line breaks stay inside a paragraph. */
export function splitParagraphs(content: string): string[] {
  return content
    .split(/\r?\n[ \t]*\r?\n\s*/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}
