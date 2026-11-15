/**
 * Real-input evaluation: 25 questions written the way people actually type them (names,
 * gifts and budgets, short or misspelt phrases, comparisons, "popular" requests). Many have
 * no single right answer, so this script only collects what happened for a person to judge.
 *
 *   npm run rag:eval:real
 *
 * Runs intent + rewrite → vector top 30 → dedupe → rerank top 3 (one LLM call per question).
 * See WHISKY_RAG_SPEC.md §7.5.
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

interface RealQuestion {
  id: number
  category: string
  question: string
  ideal: string
}

const questions: RealQuestion[] = JSON.parse(readFileSync(join(import.meta.dirname, 'evalRealQuestions.json'), 'utf8'))

const shortName = (item: SearchResult) => item.name.split('(')[0].trim()
/** The first tasting line (usually Nose), enough to judge the style at a glance. */
const excerpt = (item: SearchResult) => (item.text.split('\n')[1] ?? '').slice(0, 160)

await connectDatabase()

const results = []
const pickCounts = new Map<string, number>()

for (const q of questions) {
  const started = Date.now()
  const analysis = toQueryAnalysis(await requestSearchQuery(q.question))
  const rewriteMs = Date.now() - started

  console.log(`\n#${q.id} [${q.category}] ${q.question}`)
  console.log(`   理想：${q.ideal}`)
  console.log(`   intent: ${analysis.intent}（${rewriteMs} ms）`)
  if (analysis.intent === 'other') {
    results.push({ ...q, intent: analysis.intent })
    continue
  }
  console.log(`   改寫：${analysis.searchQuery}`)

  const found = dedupeByBaseName(await searchByFlavour(analysis.searchQuery, SEARCH_COUNT))
  const vectorTop = found.slice(0, PICK_COUNT)
  const rerankTop = await rerankCandidates(analysis.searchQuery, found, PICK_COUNT)

  console.log('   向量前 3：' + vectorTop.map(shortName).join(' | '))
  for (const item of rerankTop) {
    pickCounts.set(shortName(item), (pickCounts.get(shortName(item)) ?? 0) + 1)
    console.log(`   R [向量${found.indexOf(item) + 1}] #${item.whiskyId} ${item.name.slice(0, 80)}`)
    console.log(`       ${excerpt(item)}…`)
  }
  results.push({
    ...q,
    intent: analysis.intent,
    searchQuery: analysis.searchQuery,
    vector: vectorTop.map((item) => ({ whiskyId: item.whiskyId, name: item.name })),
    rerank: rerankTop.map((item) => ({ whiskyId: item.whiskyId, name: item.name, excerpt: excerpt(item) })),
  })
}

const regulars = [...pickCounts.entries()].filter(([, count]) => count >= 3).map(([name, count]) => `${name} ×${count}`)
const totalPicks = [...pickCounts.values()].reduce((sum, count) => sum + count, 0)
console.log('\n==== 總結 ====')
console.log(`找酒：${results.filter((r) => r.intent === 'recommend').length} 題，other：${results.filter((r) => r.intent === 'other').length} 題`)
console.log(`不重複酒款：${pickCounts.size}/${totalPicks}`)
console.log('常客（≥3 次）：' + (regulars.join('、') || '無'))

const outDir = join(import.meta.dirname, 'output')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, `eval-real-${new Date().toISOString().slice(0, 10)}.json`)
writeFileSync(outPath, JSON.stringify({ results }, null, 2))
console.log('詳細結果：' + outPath)

await mongoose.disconnect()
