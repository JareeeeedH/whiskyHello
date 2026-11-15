import mongoose from 'mongoose'
import { SommelierLog, type SommelierLogFields } from '../models/SommelierLog'

/** What one Sommelier request did; mirrors the SommelierLog schema with plain arrays. */
export interface SommelierLogEntry {
  message: string
  loggedIn: boolean
  status: 'ok' | 'off_topic' | 'error'
  intent?: 'recommend' | 'other'
  searchQuery?: string
  candidateIds?: string[]
  picks?: { whiskyId: string; score: number }[]
  rerankFallback?: boolean
  recommendationIds?: string[]
  errorStatus?: number
  errorMessage?: string
  durations: { rewriteMs?: number; searchMs?: number; rerankMs?: number; cardsMs?: number; totalMs: number }
}

/**
 * Saves one Sommelier request in the background. A failed save is only reported in the
 * server log: the user's answer never waits for, or fails because of, the query log.
 */
export function saveSommelierLog(entry: SommelierLogEntry): void {
  // Without a database the write would wait 10 s and fail; there is nothing to log into.
  if (mongoose.connection.readyState !== 1) {
    return
  }
  SommelierLog.create(entry).catch((error: unknown) => {
    console.error('Sommelier log not saved:', error instanceof Error ? error.message : error)
  })
}

export interface SommelierLogPage {
  logs: (SommelierLogFields & { id: string })[]
  page: number
  limit: number
  total: number
}

/** Newest first, `limit` per page. */
export async function listSommelierLogs(page: number, limit: number): Promise<SommelierLogPage> {
  const [docs, total] = await Promise.all([
    SommelierLog.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SommelierLog.countDocuments(),
  ])
  const logs = docs.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }))
  return { logs, page, limit, total }
}
