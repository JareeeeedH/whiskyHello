import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseCriticReview, splitParagraphs } from './criticReviewParser.ts'

function summary(text: string) {
  return parseCriticReview(text)?.map(({ key, label, qualifier, content }) => ({
    key,
    label,
    qualifier,
    content,
  }))
}

describe('parseCriticReview', () => {
  it('parses a full English review on one line', () => {
    const sections = parseCriticReview(
      'Colour: pale gold. Nose: fresh and fruity. Mouth: rich and honeyed. Finish: medium. Comments: Why not?',
    )

    assert.deepEqual(sections, [
      { key: 'colour', label: '顏色', labelEn: 'Colour', qualifier: '', content: 'pale gold.' },
      { key: 'nose', label: '香氣', labelEn: 'Nose', qualifier: '', content: 'fresh and fruity.' },
      { key: 'palate', label: '口感', labelEn: 'Palate', qualifier: '', content: 'rich and honeyed.' },
      { key: 'finish', label: '餘韻', labelEn: 'Finish', qualifier: '', content: 'medium.' },
      { key: 'comments', label: '評論', labelEn: 'Comments', qualifier: '', content: 'Why not?' },
    ])
  })

  it('parses Chinese labels with full-width colons', () => {
    assert.deepEqual(summary('顏色：淡金色。香氣：清新而果香豐富。口感：濃郁。餘韻：中等。評論：很好。'), [
      { key: 'colour', label: '顏色', qualifier: '', content: '淡金色。' },
      { key: 'nose', label: '香氣', qualifier: '', content: '清新而果香豐富。' },
      { key: 'palate', label: '口感', qualifier: '', content: '濃郁。' },
      { key: 'finish', label: '餘韻', qualifier: '', content: '中等。' },
      { key: 'comments', label: '評論', qualifier: '', content: '很好。' },
    ])
  })

  it('parses the AI translation block format, with labels alone on their own line', () => {
    const translation = [
      '一張精彩的酒標。',
      '色澤\n白葡萄酒色。',
      '香氣\n酸爽風格。加水後：割草氣息。',
      '口感（純飲）\n完美。',
      '餘韻\n中等長度。',
      '評語\n也很出色。',
    ].join('\n\n')

    assert.deepEqual(summary(translation), [
      { key: 'unknown', label: '', qualifier: '', content: '一張精彩的酒標。' },
      { key: 'colour', label: '顏色', qualifier: '', content: '白葡萄酒色。' },
      { key: 'nose', label: '香氣', qualifier: '', content: '酸爽風格。加水後：割草氣息。' },
      { key: 'palate', label: '口感', qualifier: '（純飲）', content: '完美。' },
      { key: 'finish', label: '餘韻', qualifier: '', content: '中等長度。' },
      { key: 'comments', label: '評論', qualifier: '', content: '也很出色。' },
    ])
  })

  it('parses a review with only some sections', () => {
    assert.deepEqual(summary('Nose: peat smoke. Finish: long.'), [
      { key: 'nose', label: '香氣', qualifier: '', content: 'peat smoke.' },
      { key: 'finish', label: '餘韻', qualifier: '', content: 'long.' },
    ])
  })

  it('parses sections split across lines', () => {
    assert.deepEqual(summary('Colour:\npale gold\n\nNose:\nfresh and fruity\n\nPalate:\noily'), [
      { key: 'colour', label: '顏色', qualifier: '', content: 'pale gold' },
      { key: 'nose', label: '香氣', qualifier: '', content: 'fresh and fruity' },
      { key: 'palate', label: '口感', qualifier: '', content: 'oily' },
    ])
  })

  it('accepts label variants, any case, and keeps qualifiers instead of dropping them', () => {
    assert.deepEqual(
      summary('COLOR: amber. nose (neat): honey. Taste (with water): pears. Comment: fine.'),
      [
        { key: 'colour', label: '顏色', qualifier: '', content: 'amber.' },
        { key: 'nose', label: '香氣', qualifier: '(neat)', content: 'honey.' },
        { key: 'palate', label: '口感', qualifier: '(with water)', content: 'pears.' },
        { key: 'comments', label: '評論', qualifier: '', content: 'fine.' },
      ],
    )
  })

  it('keeps an empty section when two labels follow each other', () => {
    assert.deepEqual(summary('Colour: Nose: strawberry yoghurt. Mouth: sweet.'), [
      { key: 'colour', label: '顏色', qualifier: '', content: '' },
      { key: 'nose', label: '香氣', qualifier: '', content: 'strawberry yoghurt.' },
      { key: 'palate', label: '口感', qualifier: '', content: 'sweet.' },
    ])
  })

  it('falls back to the original text when there is no section label', () => {
    assert.equal(parseCriticReview('Tried this one 5 years ago and really liked it (WF 84).'), null)
    assert.equal(parseCriticReview('一款很棒的威士忌，香氣十足。'), null)
  })

  it('falls back when only one kind of section is found', () => {
    assert.equal(parseCriticReview('Comments: a lovely dram.'), null)
  })

  it('keeps text before the first label and unknown labels instead of dropping them', () => {
    const sections = parseCriticReview(
      "A fabulous label sporting 'God'. Colour: white wine. Nose: sour. With water: cut grass. Mouth: chalk. SGP:651 - 90 points.",
    )

    assert.deepEqual(
      sections?.map(({ key, content }) => ({ key, content })),
      [
        { key: 'unknown', content: "A fabulous label sporting 'God'." },
        { key: 'colour', content: 'white wine.' },
        { key: 'nose', content: 'sour. With water: cut grass.' },
        { key: 'palate', content: 'chalk. SGP:651 - 90 points.' },
      ],
    )
  })

  it('does not split on an ordinary colon or a label word inside a sentence', () => {
    assert.equal(parseCriticReview('A great nose: lemony. The finish: long. My comments: none.'), null)

    assert.deepEqual(
      summary('Colour: gold. Nose: Magnificent nose. Ratio 3:1, as he says: wow. Finish: the mouth: dry.'),
      [
        { key: 'colour', label: '顏色', qualifier: '', content: 'gold.' },
        { key: 'nose', label: '香氣', qualifier: '', content: 'Magnificent nose. Ratio 3:1, as he says: wow.' },
        { key: 'finish', label: '餘韻', qualifier: '', content: 'the mouth: dry.' },
      ],
    )
  })

  it('does not split on a Chinese label word inside a sentence', () => {
    assert.equal(parseCriticReview('它的香氣：很好，口感：也不錯。'), null)
  })

  it('returns null for an empty or blank review', () => {
    assert.equal(parseCriticReview(''), null)
    assert.equal(parseCriticReview('  \n  '), null)
  })

  it('keeps paragraphs inside a section', () => {
    const sections = parseCriticReview('Nose: lemon.\n\nWith water: grass.\nMore chalk.\n\nComments: first.\n\nSecond.')

    assert.equal(sections?.[0].content, 'lemon.\n\nWith water: grass.\nMore chalk.')
    assert.deepEqual(splitParagraphs(sections![0].content), ['lemon.', 'With water: grass.\nMore chalk.'])
    assert.deepEqual(splitParagraphs(sections![1].content), ['first.', 'Second.'])
  })

  it('loses no text other than the label words', () => {
    const text =
      'Intro line. Colour: gold. Nose (neat): honey, wax. Mouth: pears; Finish: long. Comments: yes. SGP:552 - 88 points.'
    const kept = parseCriticReview(text)!
      .map((section) => section.qualifier + section.content)
      .join('')
      .replace(/\s+/g, '')

    assert.equal(kept, 'Introline.gold.(neat)honey,wax.pears;long.yes.SGP:552-88points.')
  })
})

describe('splitParagraphs', () => {
  it('splits on blank lines and drops empty paragraphs', () => {
    assert.deepEqual(splitParagraphs('a\n\n\nb\r\n\r\nc\n'), ['a', 'b', 'c'])
    assert.deepEqual(splitParagraphs(''), [])
  })
})
