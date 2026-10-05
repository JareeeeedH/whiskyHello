import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatCompactCountdown,
  formatLotNumber,
  formatPrice,
  formatRelativeTime,
  formatScheduleTime,
  getCountdownParts,
  isEndingSoon,
} from './auctionDisplay.ts'

const NOW = new Date(2026, 9, 12, 20, 0, 0).getTime()

describe('countdown', () => {
  it('splits the remaining time into parts', () => {
    const parts = getCountdownParts(NOW + (2 * 86400 + 4 * 3600 + 5 * 60 + 6) * 1000, NOW)
    assert.deepEqual(parts, { totalSeconds: 187506, days: 2, hours: 4, minutes: 5, seconds: 6 })
  })

  it('never goes below zero', () => {
    assert.equal(getCountdownParts(NOW - 5000, NOW).totalSeconds, 0)
  })

  it('uses days and hours when a day or more remains', () => {
    assert.equal(formatCompactCountdown(getCountdownParts(NOW + 90000 * 1000, NOW)), '1 天 01 小時')
  })

  it('uses HH:MM:SS under a day', () => {
    assert.equal(formatCompactCountdown(getCountdownParts(NOW + 3725 * 1000, NOW)), '01:02:05')
  })

  it('flags the final hour as ending soon, but not a finished auction', () => {
    assert.equal(isEndingSoon(getCountdownParts(NOW + 3600 * 1000, NOW)), true)
    assert.equal(isEndingSoon(getCountdownParts(NOW + 3601 * 1000, NOW)), false)
    assert.equal(isEndingSoon(getCountdownParts(NOW, NOW)), false)
  })
})

describe('formatting', () => {
  it('formats prices with thousands separators', () => {
    assert.equal(formatPrice(1234567), '1,234,567')
  })

  it('derives the lot number from the auction id', () => {
    assert.equal(formatLotNumber('64f0c0ffee00000000a1b2c3'), 'A1B2C3')
  })

  it('formats schedule times with the weekday', () => {
    assert.equal(formatScheduleTime(new Date(2026, 9, 12, 20, 5)), '10/12（一）20:05')
  })

  it('formats recent bid times relatively', () => {
    const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString()
    assert.equal(formatRelativeTime(ago(30), NOW), '剛剛')
    assert.equal(formatRelativeTime(ago(5 * 60), NOW), '5 分鐘前')
    assert.equal(formatRelativeTime(ago(3 * 3600), NOW), '3 小時前')
    assert.equal(formatRelativeTime(ago(2 * 86400), NOW), '10/10（六）20:00')
  })
})
