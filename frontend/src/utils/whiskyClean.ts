/**
 * Cleans the raw whisky dataset once, at build time (scripts/split-whisky-data.ts).
 * The raw file stays untouched; pages (and later RAG) read the cleaned output.
 *
 * Exclusion rules are ported from the Whiskey-Assistant project (backend/scripts/clean_data.py),
 * including its known misses: one Kavalan with a rum cask is dropped, and a few spirits
 * written outside the brackets (e.g. "Frapin … Grande Champagne …") slip through.
 */

/** Every named entity found in the raw dataset (58 kinds). */
const NAMED_ENTITIES: Record<string, string> = {
  mdash: '—', egrave: 'è', euro: '€', ccedil: 'ç', acirc: 'â', pound: '£', deg: '°',
  rdquo: '”', quot: '"', ldquo: '“', ecirc: 'ê', gt: '>', lt: '<', ntilde: 'ñ', iuml: 'ï',
  oacute: 'ó', Acirc: 'Â', ocirc: 'ô', icirc: 'î', ugrave: 'ù', aacute: 'á', uacute: 'ú',
  lsquo: '‘', iacute: 'í', eacute: 'é', auml: 'ä', Icirc: 'Î', frac14: '¼', uuml: 'ü',
  Ccedil: 'Ç', frac34: '¾', igrave: 'ì', aring: 'å', sect: '§', Ograve: 'Ò', frac12: '½',
  Ouml: 'Ö', trade: '™', agrave: 'à', atilde: 'ã', Auml: 'Ä', ouml: 'ö', Igrave: 'Ì',
  Agrave: 'À', Iuml: 'Ï', raquo: '»', Aacute: 'Á', reg: '®', acute: '´', aelig: 'æ',
  iexcl: '¡', Eacute: 'É', times: '×', amp: '&', nbsp: ' ', rsquo: '’', hellip: '…',
}

const ENTITY = /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi

/** `cr&egrave;me` → `crème`. Unknown names are left as written. */
export function decodeHtmlEntities(text: string): string {
  return text.replace(ENTITY, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      return String.fromCodePoint(parseInt(body.slice(2), 16))
    }
    if (body.startsWith('#')) {
      return String.fromCodePoint(parseInt(body.slice(1), 10))
    }
    return NAMED_ENTITIES[body] ?? whole
  })
}

/** Entities the decoder does not know, so the build can report them. */
export function unknownEntities(text: string): string[] {
  return [...text.matchAll(ENTITY)].map((m) => m[0]).filter((e) => decodeHtmlEntities(e) === e)
}

/** Names are one line: decode, collapse every run of whitespace, trim. */
export function cleanName(raw: string): string {
  return decodeHtmlEntities(raw).replace(/\s+/g, ' ').trim()
}

/** Notes keep their line breaks; the section parser reads labels written on their own line. */
export function cleanNote(raw: string): string {
  return decodeHtmlEntities(raw).trim()
}

/** A bracket item equal to one of these (as a whole item) means the bottle is not whisky. */
const OTHER_SPIRITS = new Set([
  'rum', 'rhum', 'agricole', 'rhum agricole', 'tequila', 'mezcal', 'raicilla', 'sotol',
  'cognac', 'armagnac', 'bas-armagnac', 'haut-armagnac', 'ténarèze', 'tenareze',
  'grande champagne', 'petite champagne', 'fine champagne', 'borderies', 'fins bois',
  'bons bois', 'calvados', 'pommeau', 'brandy', 'eau-de-vie', 'grappa', 'pisco',
  'cachaca', 'cachaça', 'gin', 'vodka', 'baijiu', 'arrack', 'liqueur',
])

/** Many rums are named only by their origin, so places count too. */
const OTHER_SPIRIT_PLACES = new Set([
  'barbados', 'jamaica', 'guyana', 'demerara', 'martinique', 'guadeloupe', 'marie-galante',
  'trinidad', 'haiti', 'panama', 'venezuela', 'mauritius', 'cuba', 'dominican republic',
  'fiji', 'reunion', 'réunion', 'nicaragua', 'guatemala', 'belize', 'grenada', 'st lucia',
  'saint lucia', 'antigua', 'puerto rico', 'philippines', 'mexico', 'colombia', 'peru',
  'bolivia', 'brazil', 'guadalajara', 'jalisco', 'oaxaca', 'ecuador', 'madagascar',
])

// Python's \b is Unicode-aware; these lookarounds give the same word edges in JS.
const RUM_WORD = /(?<![\p{L}\p{N}_])(rum|rhum)(?![\p{L}\p{N}_])/u
const RHUM_WORD = /(?<![\p{L}\p{N}_])rhum(?![\p{L}\p{N}_])/u

function isOtherSpirit(text: string): boolean {
  return OTHER_SPIRITS.has(text) || OTHER_SPIRIT_PLACES.has(text)
}

function withoutLa(text: string): string {
  return text.startsWith('la ') ? text.slice(3) : text
}

/** The name up to the first digit, quote or bracket: `Hampden 8 yo (…)` → `hampden`. */
export function brandOf(name: string): string {
  return (name.split(/\s+(?=\d|['‘’"“(])|\s*\(/)[0] ?? '').trim().toLowerCase()
}

/** The word that marks the bottle as not whisky, or null when it looks like whisky. */
export function otherSpiritMatch(name: string): string | null {
  // Some rums and cognacs use the place or category as the name, e.g. `Jamaica 1990 (…)`.
  const brand = withoutLa(brandOf(name))
  if (isOtherSpirit(brand) || RUM_WORD.test(brand)) {
    return brand
  }
  for (const group of name.matchAll(/\(([^()]*)\)/g)) {
    for (const part of (group[1] ?? '').split(',')) {
      const item = withoutLa(part.trim().toLowerCase())
      if (isOtherSpirit(item)) {
        return item
      }
      // The French bottler `Whisky & Rhum` sells whisky.
      if (RHUM_WORD.test(item) && !item.includes('whisky')) {
        return item
      }
    }
  }
  return null
}

/**
 * Brands where at least 10% of bottles are flagged as not whisky: many rums only carry the
 * distillery name (`Hampden 8 yo (56.5%, Kintra)`). Non-whisky brands measured at 14% or more;
 * whisky distilleries wrongly flagged peaked at about 6%.
 */
export function otherSpiritBrands(names: string[]): Set<string> {
  const flagged = new Map<string, number>()
  const total = new Map<string, number>()
  for (const name of names) {
    const brand = brandOf(name)
    total.set(brand, (total.get(brand) ?? 0) + 1)
    if (otherSpiritMatch(name) !== null) {
      flagged.set(brand, (flagged.get(brand) ?? 0) + 1)
    }
  }
  const brands = new Set<string>()
  for (const [brand, count] of flagged) {
    if (count / (total.get(brand) ?? 1) >= 0.1) {
      brands.add(brand)
    }
  }
  return brands
}

export type ExcludeReason = '酒名是一句話' | '非威士忌烈酒' | '非威士忌烈酒（同品牌推斷）'

export interface ExcludedWhisky {
  id: unknown
  name: string
  reason: ExcludeReason
  /** The word that triggered the rule (the brand for brand inference). */
  matched: string | null
}

export interface CleanResult {
  /** Same fields as the raw records, with NAME and NOTE cleaned; SCORE and IMAGE_PATH untouched. */
  kept: Record<string, unknown>[]
  excluded: ExcludedWhisky[]
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function cleanWhiskyDataset(rawList: Record<string, unknown>[]): CleanResult {
  const names = rawList.map((raw) => cleanName(textOf(raw.NAME)))
  const otherBrands = otherSpiritBrands(names)

  const kept: Record<string, unknown>[] = []
  const excluded: ExcludedWhisky[] = []

  rawList.forEach((raw, i) => {
    const name = names[i] ?? ''
    let reason: ExcludeReason | null = null
    let matched: string | null = null

    // Without brackets the "name" is really a sentence and names no bottle.
    if (!name.includes('(')) {
      reason = '酒名是一句話'
    } else if ((matched = otherSpiritMatch(name)) !== null) {
      reason = '非威士忌烈酒'
    } else if (otherBrands.has(brandOf(name))) {
      reason = '非威士忌烈酒（同品牌推斷）'
      matched = brandOf(name)
    }

    if (reason !== null) {
      excluded.push({ id: raw.id, name, reason, matched })
      return
    }

    const record: Record<string, unknown> = { ...raw, NAME: name }
    if (typeof raw.NOTE === 'string') {
      record.NOTE = cleanNote(raw.NOTE)
    }
    kept.push(record)
  })

  return { kept, excluded }
}
