import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildEmbeddingSentence } from './flavourSentence'

describe('buildEmbeddingSentence', () => {
  it('writes taste and body', () => {
    const sentence = buildEmbeddingSentence({
      taste: { floral: 2, maltGrain: 5 },
      style: { body: 3 },
      occasion: 'relaxing',
      budget: { max: 2500 },
    })
    assert.equal(
      sentence,
      'Light-bodied whisky with a hint of floral notes and noticeable malty, grainy notes.',
    )
  })

  it('writes 8–10 as dominant and full-bodied', () => {
    const sentence = buildEmbeddingSentence({
      taste: { peat: 9, smoke: 8, spice: 4 },
      style: { body: 9 },
      occasion: 'tasting',
      budget: { max: 5000 },
    })
    assert.equal(
      sentence,
      'Full-bodied whisky with dominant peaty notes, dominant smoky notes and noticeable spicy notes.',
    )
  })

  it('writes 4–7 as noticeable and medium-bodied', () => {
    const sentence = buildEmbeddingSentence({
      taste: { fruit: 7, sweet: 6, oak: 3 },
      style: { body: 5 },
    })
    assert.equal(
      sentence,
      'Medium-bodied whisky with noticeable fruity notes, noticeable sweet, honey notes and a hint of oaky, woody notes.',
    )
  })

  it('handles five tastes and the score edges 1, 3, 4, 7, 10', () => {
    const sentence = buildEmbeddingSentence({
      taste: { fruit: 10, sweet: 3, floral: 1, spice: 4, oak: 7 },
      style: { body: 1 },
    })
    assert.equal(
      sentence,
      'Light-bodied whisky with dominant fruity notes, a hint of sweet, honey notes, a hint of floral notes, noticeable spicy notes and noticeable oaky, woody notes.',
    )
  })
})
