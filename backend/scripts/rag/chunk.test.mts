import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildChunk, cleanText, type ChunkResult, type WhiskyChunk } from './chunk.mts'

function chunkOf(result: ChunkResult): WhiskyChunk {
  assert.equal(result.status, 'ok')
  return result.chunk
}

const FULL_NOTE =
  'A sister cask of the one we tried last week (WF 88). Colour: gold. ' +
  'Nose: peat smoke and lemon. With water: brine. ' +
  'Mouth (neat): ashy, peppery. ' +
  'Finish: long and smoky. ' +
  'Comments: classic coastal style.'

describe('cleanText', () => {
  it('decodes named and numeric entities and keeps accents', () => {
    assert.equal(cleanText('cr&egrave;me br&ucirc;l&eacute;e &mdash; it&#8217;s'), 'crème brûlée — it’s')
  })

  it('collapses line breaks and repeated spaces', () => {
    assert.equal(cleanText('  peat\n\n  and   smoke  '), 'peat and smoke')
  })
})

describe('buildChunk', () => {
  it('writes the name and the four tasting sections, one per line', () => {
    const chunk = chunkOf(
      buildChunk({ id: 420, NAME: 'Ardbeg 10 yo ', NOTE: FULL_NOTE, SCORE: 'SGP: 357 - 86 points' }),
    )

    assert.deepEqual(chunk, {
      whiskyId: '420',
      name: 'Ardbeg 10 yo',
      points: 86,
      text: [
        'Ardbeg 10 yo',
        'Nose: peat smoke and lemon. With water: brine.',
        'Mouth: ashy, peppery.',
        'Finish: long and smoky.',
        'Comments: classic coastal style.',
      ].join('\n'),
    })
  })

  it('leaves out the intro and Colour', () => {
    const { text } = chunkOf(buildChunk({ id: 1, NAME: 'Ardbeg', NOTE: FULL_NOTE }))

    assert.doesNotMatch(text, /sister cask/)
    assert.doesNotMatch(text, /Colour|gold/)
  })

  it('labels Palate and Taste as Mouth', () => {
    const palate = chunkOf(buildChunk({ id: 1, NAME: 'A', NOTE: 'Nose: x. Palate: sweet.' }))
    const taste = chunkOf(buildChunk({ id: 2, NAME: 'B', NOTE: 'Nose: x. Taste: sweet.' }))

    assert.match(palate.text, /^Mouth: sweet\.$/m)
    assert.match(taste.text, /^Mouth: sweet\.$/m)
  })

  it('decodes entities in the name and the note', () => {
    const chunk = chunkOf(
      buildChunk({
        id: 1,
        NAME: 'Ben Nevis (C&agrave;rn Mor)',
        NOTE: 'Nose: cr&egrave;me caramel. Mouth: sweet.',
      }),
    )

    assert.equal(chunk.name, 'Ben Nevis (Càrn Mor)')
    assert.match(chunk.text, /Nose: crème caramel\./)
  })

  it('omits a missing section instead of writing an empty label', () => {
    const { text } = chunkOf(buildChunk({ id: 1, NAME: 'A', NOTE: 'Nose: smoke. Comments: good.' }))

    assert.equal(text, 'A\nNose: smoke.\nComments: good.')
  })

  it('keeps every part when a note repeats a label', () => {
    const { text } = chunkOf(
      buildChunk({ id: 1, NAME: 'A', NOTE: 'Nose: smoke. Mouth: ash. Nose: more smoke.' }),
    )

    assert.match(text, /^Nose: smoke\. more smoke\.$/m)
  })

  it('leaves points out when the score is not a number', () => {
    const chunk = chunkOf(
      buildChunk({ id: 1, NAME: 'A', NOTE: 'Nose: x. Mouth: y.', SCORE: 'around 65 points' }),
    )

    assert.equal('points' in chunk, false)
  })

  it('skips a record without an id', () => {
    assert.deepEqual(buildChunk({ NAME: 'A', NOTE: 'Nose: x.' }), {
      status: 'skipped',
      reason: 'missing_id',
    })
  })

  it('skips a record without a name', () => {
    assert.deepEqual(buildChunk({ id: 7, NAME: '   ', NOTE: 'Nose: x.' }), {
      status: 'skipped',
      whiskyId: '7',
      reason: 'missing_name',
    })
  })

  it('skips a note with a single label, which the parser does not trust as a tasting note', () => {
    assert.deepEqual(buildChunk({ id: 7, NAME: 'A', NOTE: 'Nose: smoke.' }), {
      status: 'skipped',
      whiskyId: '7',
      reason: 'no_sections',
    })
  })

  it('skips a note with no tasting section', () => {
    assert.deepEqual(buildChunk({ id: 7, NAME: 'A', NOTE: 'Just a story, no tasting.' }), {
      status: 'skipped',
      whiskyId: '7',
      reason: 'no_sections',
    })
  })
})
