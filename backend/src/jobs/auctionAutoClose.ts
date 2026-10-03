import { env } from '../config/env'
import {
  activateScheduledAuctions,
  closeExpiredAuctions,
} from '../services/auctionService'

export const AUCTION_AUTO_CLOSE_INTERVAL_MS = 60_000

let running = false

/** Lifecycle tick: scheduled → active (startAt reached), then active → ended (endAt reached). */
export async function runAuctionAutoClose(now = new Date()): Promise<void> {
  if (running) {
    return
  }

  running = true
  try {
    const activated = await activateScheduledAuctions(now)
    if (activated > 0) {
      console.log(`Auction lifecycle: ${activated} auction(s) activated.`)
    }

    const closed = await closeExpiredAuctions(now)
    if (closed > 0) {
      console.log(`Auction auto close: ${closed} auction(s) ended.`)
    }
  } catch (error) {
    console.error('Auction auto close failed.')
    // Do not log raw error.message in production — it may include credentials in the URI.
    if (!env.isProduction) {
      console.error(error instanceof Error ? error.message : error)
    }
  } finally {
    running = false
  }
}

export function startAuctionAutoClose(
  intervalMs = AUCTION_AUTO_CLOSE_INTERVAL_MS,
): NodeJS.Timeout {
  void runAuctionAutoClose()
  const timer = setInterval(() => {
    void runAuctionAutoClose()
  }, intervalMs)
  timer.unref()
  return timer
}
