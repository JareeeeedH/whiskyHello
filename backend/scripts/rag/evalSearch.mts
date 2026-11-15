/**
 * Search evaluation: runs the 20 questions in evalQuestions.json through the Sommelier search
 * (intent + rewrite → vector top 30 → dedupe → rerank top 3) and checks the results by keyword.
 *
 *   npm run rag:eval
 *
 * Stops before the recommendation cards, so each question costs one LLM call plus one embedding.
 * Keyword checks only tell whether a note mentions a word, not whether it is the main flavour,
 * and "no peat" still counts as mentioning peat. See WHISKY_RAG_SPEC.md §7.4.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import mongoose from 'mongoose'
import { connectDatabase } from '../../src/config/db.ts'
import { searchByFlavour, type SearchResult } from '../../src/services/flavourSearchService.ts'
import { requestSearchQuery } from '../../src/services/openaiWhiskyRecommender.ts'
import { rerankCandidates } from '../../src/services/rerankService.ts'
import { toQueryAnalysis } from '../../src/services/sommelierService.ts'
import { dedupeByBaseName } from '../../src/utils/dedupeWhiskies.ts'

/** Same numbers as the Sommelier (sommelierService.ts). */
const SEARCH_COUNT = 30
const PICK_COUNT = 3
/** A whisky picked this many times or more counts as a regular. */
const REGULAR_MIN = 3

interface EvalQuestion {
  id: number
  type: 'flavour' | 'negation' | 'similar' | 'english' | 'vague' | 'offTopic'
  question: string
  /** Every group needs at least one of its words in the note. */
  mustHave?: string[][]
  /** None of these may appear in the note. */
  mustNot?: string[]
  /** The bottle's name may not contain this brand. */
  notBrand?: string
}

interface PickCheck {
  whiskyId: string
  name: string
  pass: boolean
  missing: string[]
  forbidden: string[]
}

const questions: EvalQuestion[] = JSON.parse(readFileSync(join(import.meta.dirname, 'evalQuestions.json'), 'utf8'))

/** The tasting note without the first line, so a name like "Big Peat" does not count as peat. */
function noteOf(item: SearchResult): string {
  return item.text.split('\n').slice(1).join('\n').toLowerCase()
}

function checkPick(item: SearchResult, q: EvalQuestion): PickCheck {
  const note = noteOf(item)
  const missing: string[] = []
  for (const group of q.mustHave ?? []) {
    if (!group.some((word) => note.includes(word))) {
      missing.push(group.join('/'))
    }
  }
  const forbidden = (q.mustNot ?? []).filter((word) => note.includes(word))
  if (q.notBrand && item.name.toLowerCase().includes(q.notBrand)) {
    forbidden.push('brand:' + q.notBrand)
  }
  return { whiskyId: item.whiskyId, name: item.name, pass: missing.length === 0 && forbidden.length === 0, missing, forbidden }
}

await connectDatabase()

const results = []
let intentCorrect = 0
let vectorPass = 0
let rerankPass = 0
let checkedPicks = 0
const pickCounts = new Map<string, { name: string; count: number }>()

for (const q of questions) {
  const analysis = toQueryAnalysis(await requestSearchQuery(q.question))
  const expectOther = q.type === 'offTopic'
  const intentOk = (analysis.intent === 'other') === expectOther
  if (intentOk) intentCorrect++

  console.log(`\n#${q.id} [${q.type}] ${q.question}  → intent ${analysis.intent} ${intentOk ? '✓' : '✗'}`)
  if (analysis.intent === 'other') {
    results.push({ ...q, intent: analysis.intent, intentOk })
    continue
  }
  console.log('   ' + analysis.searchQuery)

  const found = dedupeByBaseName(await searchByFlavour(analysis.searchQuery, SEARCH_COUNT))
  const vectorTop = found.slice(0, PICK_COUNT)
  const rerankTop = await rerankCandidates(analysis.searchQuery, found, PICK_COUNT)

  for (const item of rerankTop) {
    const entry = pickCounts.get(item.whiskyId) ?? { name: item.name, count: 0 }
    entry.count++
    pickCounts.set(item.whiskyId, entry)
  }

  const checked = q.mustHave || q.mustNot || q.notBrand
  const vectorChecks = vectorTop.map((item) => checkPick(item, q))
  const rerankChecks = rerankTop.map((item) => checkPick(item, q))
  if (checked) {
    vectorPass += vectorChecks.filter((c) => c.pass).length
    rerankPass += rerankChecks.filter((c) => c.pass).length
    checkedPicks += rerankChecks.length
    console.log(`   向量 ${vectorChecks.filter((c) => c.pass).length}/3  rerank ${rerankChecks.filter((c) => c.pass).length}/3`)
  }
  for (const c of rerankChecks) {
    const why = [...c.missing.map((m) => '缺 ' + m), ...c.forbidden.map((f) => '有 ' + f)].join('、')
    console.log(`   ${checked ? (c.pass ? '✓' : '✗') : '·'} #${c.whiskyId} ${c.name.slice(0, 60)}${why ? '  (' + why + ')' : ''}`)
  }
  results.push({ ...q, intent: analysis.intent, intentOk, searchQuery: analysis.searchQuery, vector: vectorChecks, rerank: rerankChecks })
}

const recommendQuestions = results.filter((r) => r.intent === 'recommend').length
const totalPicks = [...pickCounts.values()].reduce((sum, e) => sum + e.count, 0)
const regulars = [...pickCounts.values()].filter((e) => e.count >= REGULAR_MIN).sort((a, b) => b.count - a.count)
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0) + '%'

const summary = {
  date: new Date().toISOString(),
  intentCorrect: `${intentCorrect}/${questions.length}`,
  vectorPass: `${vectorPass}/${checkedPicks} (${pct(vectorPass, checkedPicks)})`,
  rerankPass: `${rerankPass}/${checkedPicks} (${pct(rerankPass, checkedPicks)})`,
  uniqueWhiskies: `${pickCounts.size}/${totalPicks}`,
  regulars: regulars.map((e) => `${e.name.split('(')[0].trim()} ×${e.count}`),
  recommendQuestions,
}

console.log('\n==== 總結 ====')
console.log('意圖正確：     ' + summary.intentCorrect)
console.log('符合需求（向量前 3）：  ' + summary.vectorPass)
console.log('符合需求（rerank 前 3）：' + summary.rerankPass)
console.log('不重複酒款：   ' + summary.uniqueWhiskies)
console.log(`常客（≥${REGULAR_MIN} 次）：  ` + (summary.regulars.join('、') || '無'))

const outDir = join(import.meta.dirname, 'output')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, `eval-${summary.date.slice(0, 10)}.json`)
writeFileSync(outPath, JSON.stringify({ summary, results }, null, 2))
console.log('詳細結果：' + outPath)

await mongoose.disconnect()
