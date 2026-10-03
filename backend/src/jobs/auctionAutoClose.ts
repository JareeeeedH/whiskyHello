import { env } from '../config/env'
import { closeExpiredAuctions } from '../services/auctionService'

export const AUCTION_AUTO_CLOSE_INTERVAL_MS = 60_000

let running = false

export async function runAuctionAutoClose(): Promise<void> {
  if (running) {
    return
  }

  running = true
  try {
    const closed = await closeExpiredAuctions()
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
