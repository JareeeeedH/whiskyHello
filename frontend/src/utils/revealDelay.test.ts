import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { revealDelayMs } from './revealDelay.ts'

describe('revealDelayMs', () => {
  it('staggers siblings by 70 ms, starting at 0', () => {
    assert.equal(revealDelayMs(), 0)
    assert.equal(revealDelayMs(0), 0)
    assert.equal(revealDelayMs(1), 70)
    assert.equal(revealDelayMs(3), 210)
  })

  it('caps the delay so long lists never wait', () => {
    assert.equal(revealDelayMs(5), 350)
    assert.equal(revealDelayMs(40), 350)
  })

  it('ignores negative and fractional steps', () => {
    assert.equal(revealDelayMs(-2), 0)
    assert.equal(revealDelayMs(1.8), 70)
  })
})
