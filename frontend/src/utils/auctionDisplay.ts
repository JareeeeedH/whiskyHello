/** Display-only helpers for auction pages; they never affect bidding rules. */

export const ENDING_SOON_SECONDS = 60 * 60

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const

export interface CountdownParts {
  totalSeconds: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function getCountdownParts(targetMs: number, nowMs: number): CountdownParts {
  const totalSeconds = Math.max(0, Math.floor((targetMs - nowMs) / 1000))
  return {
    totalSeconds,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** `2 天 04 小時` when a day or more remains, otherwise `HH:MM:SS`. */
export function formatCompactCountdown(parts: CountdownParts): string {
  return parts.days > 0
    ? `${parts.days} 天 ${pad(parts.hours)} 小時`
    : `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`
}

export function isEndingSoon(parts: CountdownParts): boolean {
  return parts.totalSeconds > 0 && parts.totalSeconds <= ENDING_SOON_SECONDS
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('zh-TW').format(value)
}

export function formatLotNumber(auctionId: string): string {
  return auctionId.slice(-6).toUpperCase()
}

/** Local `10/12（一）20:00`, used for upcoming auction scheduling. */
export function formatScheduleTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return `${date.getMonth() + 1}/${date.getDate()}（${WEEKDAYS[date.getDay()]}）${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatAbsoluteTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** `剛剛` / `5 分鐘前` / `3 小時前`, falling back to the schedule format after a day. */
export function formatRelativeTime(value: string, nowMs: number): string {
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) {
    return value
  }
  const seconds = Math.max(0, Math.floor((nowMs - time) / 1000))
  if (seconds < 60) {
    return '剛剛'
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} 分鐘前`
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)} 小時前`
  }
  return formatScheduleTime(new Date(time))
}
