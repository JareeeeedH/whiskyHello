/**
 * Format an ISO date as a short relative label (zh-TW style).
 * e.g. 剛剛 / 2 小時前 / 昨天 / 3 天前 / 2026/3/25
 */
export function formatRelativeTime(
  isoDate: string,
  now: Date = new Date(),
): string {
  const then = new Date(isoDate)
  if (Number.isNaN(then.getTime())) return ''

  const diffMs = now.getTime() - then.getTime()
  if (diffMs < 0) return '剛剛'

  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) return '剛剛'
  if (diffMs < hour) {
    const m = Math.floor(diffMs / minute)
    return `${m} 分鐘前`
  }
  if (diffMs < day) {
    const h = Math.floor(diffMs / hour)
    return `${h} 小時前`
  }

  const days = Math.floor(diffMs / day)
  if (days === 1) return '昨天'
  if (days < 30) return `${days} 天前`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} 個月前`

  return then.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}
