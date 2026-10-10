import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dropOpacity, fallPosition, nextDropPhase } from './whiskyDrop.ts'

describe('nextDropPhase', () => {
  it('starts falling once the glass rises past the fall line', () => {
    assert.equal(nextDropPhase('following', 800, 1000), 'following')
    assert.equal(nextDropPhase('following', 700, 1000), 'falling')
  })

  it('stays put between the fall and reset lines', () => {
    assert.equal(nextDropPhase('falling', 850, 1000), 'falling')
    assert.equal(nextDropPhase('landed', 850, 1000), 'landed')
  })

  it('returns to following when the glass scrolls back down', () => {
    assert.equal(nextDropPhase('landed', 950, 1000), 'following')
    assert.equal(nextDropPhase('falling', 950, 1000), 'following')
  })

  it('lands at the page bottom even if the glass never reaches the fall line', () => {
    assert.equal(nextDropPhase('following', 950, 1000, true), 'falling')
    assert.equal(nextDropPhase('landed', 950, 1000, true), 'landed')
  })
})

describe('fallPosition', () => {
  it('eases in from the rest point to the surface', () => {
    assert.equal(fallPosition(100, 500, 0), 100)
    assert.equal(fallPosition(100, 500, 0.5), 200)
    assert.equal(fallPosition(100, 500, 1), 500)
  })

  it('clamps elapsed time outside 0–1', () => {
    assert.equal(fallPosition(100, 500, -1), 100)
    assert.equal(fallPosition(100, 500, 3), 500)
  })
})

describe('dropOpacity', () => {
  it('stays hidden over the hero and fades in over the next quarter screen', () => {
    assert.equal(dropOpacity(0, 800), 0)
    assert.equal(dropOpacity(200, 800), 0)
    assert.equal(dropOpacity(300, 800), 0.5)
    assert.equal(dropOpacity(400, 800), 1)
    assert.equal(dropOpacity(5000, 800), 1)
  })
})
