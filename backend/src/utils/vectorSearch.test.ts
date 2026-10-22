import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { cosineSimilarity, findTopMatches } from './vectorSearch'

/** Decimals are not exact on a computer (0.8 can come out as 0.7999999999999998), so compare closely. */
function assertClose(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-9, 'expected ' + expected + ' but got ' + actual)
}

describe('cosineSimilarity', () => {
  it('is 1 for the same vector', () => {
    assertClose(cosineSimilarity([1, 2, 3], [1, 2, 3]), 1)
  })

  it('is 1 for the same direction, whatever the length', () => {
    assertClose(cosineSimilarity([1, 2, 3], [2, 4, 6]), 1)
  })

  it('is 0 for unrelated (perpendicular) vectors', () => {
    assertClose(cosineSimilarity([1, 0], [0, 1]), 0)
  })

  it('is -1 for opposite vectors', () => {
    assertClose(cosineSimilarity([1, 0], [-1, 0]), -1)
  })

  it('matches a hand-worked example', () => {
    // dot = 1*2 + 2*1 = 4; lengths = √5 and √5; 4 / 5 = 0.8
    assertClose(cosineSimilarity([1, 2], [2, 1]), 0.8)
  })

  it('is 0 when a vector is all zeros', () => {
    assert.equal(cosineSimilarity([0, 0], [1, 1]), 0)
  })

  it('refuses vectors of different lengths', () => {
    assert.throws(() => cosineSimilarity([1, 2], [1, 2, 3]), /same length/)
  })
})

describe('findTopMatches', () => {
  const items = [
    { whiskyId: '1', name: 'smoky', text: 'Nose: smoke', embedding: [1, 0] },
    { whiskyId: '2', name: 'sweet', text: 'Nose: honey', embedding: [0, 1] },
    { whiskyId: '3', name: 'mostly smoky', text: 'Nose: smoke, a little honey', embedding: [0.9, 0.1] },
  ]

  it('returns the closest items first', () => {
    const results = findTopMatches([1, 0], items, 3)
    assert.equal(results[0].name, 'smoky')
    assert.equal(results[1].name, 'mostly smoky')
    assert.equal(results[2].name, 'sweet')
  })

  it('returns only the requested count', () => {
    assert.equal(findTopMatches([1, 0], items, 2).length, 2)
  })

  it('returns everything when asking for more than there is', () => {
    assert.equal(findTopMatches([1, 0], items, 10).length, 3)
  })

  it('keeps the whisky details and score with each result', () => {
    const results = findTopMatches([1, 0], items, 1)
    assert.equal(results[0].whiskyId, '1')
    assert.equal(results[0].text, 'Nose: smoke')
    assertClose(results[0].score, 1)
  })

  it('returns an empty list when there is nothing to search', () => {
    assert.deepEqual(findTopMatches([1, 0], [], 5), [])
  })
})
