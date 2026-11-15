import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  brandOf,
  cleanName,
  cleanNote,
  cleanWhiskyDataset,
  decodeHtmlEntities,
  otherSpiritBrands,
  otherSpiritMatch,
} from './whiskyClean.ts'

describe('decodeHtmlEntities', () => {
  it('decodes named and numeric entities', () => {
    assert.equal(decodeHtmlEntities('cr&egrave;me &mdash; 10&euro;'), 'crème — 10€')
    assert.equal(decodeHtmlEntities('it&#8217;s'), 'it’s')
  })

  it('leaves unknown names as written', () => {
    assert.equal(decodeHtmlEntities('a &zzz; b'), 'a &zzz; b')
  })
})

describe('cleanName', () => {
  it('decodes, collapses whitespace and trims', () => {
    assert.equal(cleanName('  Don Fulano  &lsquo;A&ntilde;ejo&rsquo;\n(40%) '), 'Don Fulano ‘Añejo’ (40%)')
  })
})

describe('cleanNote', () => {
  it('keeps line breaks for the section parser', () => {
    assert.equal(cleanNote(' Colour: gold.\nNose: cr&egrave;me. '), 'Colour: gold.\nNose: crème.')
  })
})

describe('brandOf', () => {
  it('takes the name up to the first digit, quote or bracket', () => {
    assert.equal(brandOf('Hampden 8 yo (56.5%, Kintra)'), 'hampden')
    assert.equal(brandOf("Jean-Luc Pasquet 'Lot 62' (40.4%)"), 'jean-luc pasquet')
    assert.equal(brandOf('Glen Grant (40%, OB)'), 'glen grant')
  })
})

describe('otherSpiritMatch', () => {
  it('flags a whole bracket item that is a spirit or a rum place', () => {
    assert.equal(otherSpiritMatch("La Mauny 5 ans d'âge (45%, OB, Martinique, agricole)"), 'martinique')
    assert.equal(otherSpiritMatch('Hermitage 1995 (43%, Cognac, Grande Champagne)'), 'cognac')
  })

  it('flags a brand that is a place or contains rum', () => {
    assert.equal(otherSpiritMatch('Jamaica 1990 (46%, Kintra)'), 'jamaica')
    assert.equal(otherSpiritMatch('Jamaican Rum 2005 (50%)'), 'jamaican rum')
  })

  it('keeps whisky finished in other spirit casks and the bottler Whisky & Rhum', () => {
    assert.equal(otherSpiritMatch('Caol Ila 12 yo (46%, OB, rum cask finish)'), null)
    assert.equal(otherSpiritMatch('Ardmore 10 yo (50%, Whisky & Rhum)'), null)
  })
})

describe('otherSpiritBrands', () => {
  it('flags brands with at least 10% non-whisky bottles', () => {
    const names = [
      'Hampden 8 yo (56.5%, Kintra)',
      'Hampden 2010 (60%, Jamaica)',
      ...Array.from({ length: 19 }, (_, i) => `Ardbeg ${i + 10} yo (46%, OB)`),
      'Ardbeg 1990 (46%, OB, rum)',
    ]
    const brands = otherSpiritBrands(names)
    assert.ok(brands.has('hampden'))
    assert.ok(!brands.has('ardbeg'), 'one rum out of twenty Ardbegs stays below 10%')
  })
})

describe('cleanWhiskyDataset', () => {
  it('drops sentences and other spirits, and cleans what it keeps', () => {
    const { kept, excluded } = cleanWhiskyDataset([
      { id: 1, NAME: ' Ardbeg 10 yo  (46%, OB) ', SCORE: 'SGP:357 - 90 points', NOTE: ' Nose: cr&egrave;me. ', IMAGE_PATH: 'M/a.jpg' },
      { id: 2, NAME: 'Let’s try another one, probably of similar age, at 46%...', SCORE: '', NOTE: '' },
      { id: 3, NAME: 'Prunier 1967/2021 (52.8%, OB, grande Champagne)', SCORE: '', NOTE: '' },
    ])

    assert.deepEqual(kept, [
      { id: 1, NAME: 'Ardbeg 10 yo (46%, OB)', SCORE: 'SGP:357 - 90 points', NOTE: 'Nose: crème.', IMAGE_PATH: 'M/a.jpg' },
    ])
    assert.deepEqual(
      excluded.map((e) => [e.id, e.reason, e.matched]),
      [
        [2, '酒名是一句話', null],
        [3, '非威士忌烈酒', 'grande champagne'],
      ],
    )
  })
})
