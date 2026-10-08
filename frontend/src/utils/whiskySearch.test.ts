import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Whisky } from '../types/whisky.ts'
import { searchWhiskies } from './whiskySearch.ts'

const whiskies: Whisky[] = [
  { id: '1', name: 'Macallan 12 yo', subtitle: '(40%, OB, 2020)', points: 82 },
  { id: '2', name: 'Macallan 18 yo 1995 ‘Sherry Oak’', subtitle: '(43%, OB)', points: 89 },
  { id: '3', name: 'Ardbeg 10 yo', subtitle: '(46%, OB)', points: 79 },
  { id: '4', name: 'Glenlivet 12 yo', subtitle: '(40%, OB)', points: 80 },
  { id: '5', name: 'Glen Grant 10 yo', subtitle: '(40%, OB)', points: 81 },
  { id: '6', name: 'Glen Keith 20 yo', subtitle: '(52%, Signatory, Livet valley cask)', points: 85 },
  { id: '7', name: 'Waterford ‘Cuvée’', subtitle: '(50%, OB)', points: 88 },
  { id: '8', name: 'Highland Park 18 yo', subtitle: '(43%, OB)', points: 90 },
  { id: '9', name: 'Cardhu 12 yo', subtitle: '(40%, OB)', points: 78 },
  { id: '10', name: 'Bowmore 15 yo', subtitle: '(43%, Sherry Oak finish)', points: 95 },
]

const ids = (query: string) => searchWhiskies(whiskies, { query }).items.map((w) => w.id)

describe('searchWhiskies', () => {
  it('ignores case, spaces and missing spaces between name and age', () => {
    for (const query of ['Macallan12', 'MACALLAN 12', 'macallan12yo', 'macallan 12 years old']) {
      assert.deepEqual(ids(query), ['1'], query)
    }
  })

  it('matches words in any order', () => {
    assert.deepEqual(ids('12yo macallan'), ['1'])
    assert.deepEqual(ids('sherry oak macallan 18'), ['2'])
  })

  it('ignores quotes, accents and filler words', () => {
    assert.deepEqual(ids("macallan 'sherry oak'"), ['2'])
    assert.deepEqual(ids('cuvee'), ['7'])
    assert.deepEqual(ids('ardbeg single malt whisky'), ['3'])
  })

  it('matches from the start of a word and numbers as whole tokens', () => {
    assert.deepEqual(ids('macal'), ['2', '1'])
    assert.deepEqual(ids('ard'), ['3'])
    assert.deepEqual(ids('macallan 199'), [])
  })

  it('handles run-together and split-apart names', () => {
    assert.deepEqual(ids('highlandpark18'), ['8'])
    assert.deepEqual(ids('macallansherryoak18'), ['2'])
    assert.deepEqual(ids('glen livet'), ['4'])
  })

  it('ranks name matches before subtitle-only matches, then by points', () => {
    assert.deepEqual(ids('sherry oak'), ['2', '10'])
    assert.deepEqual(ids('glen'), ['6', '5', '4'])
  })

  it('rejects queries shorter than three characters after removing spaces', () => {
    const tooShort = { status: 'too_short', items: [] }
    assert.deepEqual(searchWhiskies(whiskies, { query: 'ma' }), tooShort)
    assert.deepEqual(searchWhiskies(whiskies, { query: 'a  ' }), tooShort)
    assert.deepEqual(searchWhiskies(whiskies, { query: '   ' }), tooShort)
  })

  it('returns no results when only filler words or unsupported characters remain', () => {
    const empty = { status: 'ok', items: [] }
    assert.deepEqual(searchWhiskies(whiskies, { query: 'the whisky' }), empty)
    assert.deepEqual(searchWhiskies(whiskies, { query: '威士忌' }), empty)
  })
})
