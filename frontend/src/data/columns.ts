// Not in generated/: that folder is git-ignored and wiped by split-whisky-data.ts on every build.
import rawColumns from './columns.json'
import type { ColumnType, WhiskyColumn } from '../types/column'

/** JSON imports widen `type` to string, so the file is typed here once. */
const columns = (rawColumns as WhiskyColumn[])
  .slice()
  .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))

export const COLUMN_TYPE_LABELS: Record<ColumnType, string> = {
  recommendation: '推薦',
  comparison: '比較',
  guide: '入門指南',
  review: '酒評',
  distillery: '酒廠',
  howto: '實用',
}

/** Newest first. */
export function getColumns(): WhiskyColumn[] {
  return columns
}

export function getColumnById(id: string): WhiskyColumn | undefined {
  return columns.find((column) => column.id === id)
}

/** Same type first, then the newest others. */
export function getRelatedColumns(current: WhiskyColumn, count: number): WhiskyColumn[] {
  const others = columns.filter((column) => column.id !== current.id)
  const sameType = others.filter((column) => column.type === current.type)
  const rest = others.filter((column) => column.type !== current.type)
  return [...sameType, ...rest].slice(0, count)
}

export function formatColumnDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
}
