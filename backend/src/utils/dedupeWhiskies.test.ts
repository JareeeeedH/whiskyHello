import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { baseWhiskyName, dedupeByBaseName } from './dedupeWhiskies'

describe('baseWhiskyName', () => {
  it('drops the bracket details and ignores case', () => {
    assert.equal(baseWhiskyName('Lagavulin 16 yo (43%, OB, +/- 2013)'), 'lagavulin 16 yo')
    assert.equal(baseWhiskyName('LAGAVULIN 16 yo  (43%, OB, +/- 2021)'), 'lagavulin 16 yo')
  })

  it('keeps the edition name, so different editions stay apart', () => {
    assert.notEqual(
      baseWhiskyName("Macallan 12 yo 'Fine Oak' (40%, OB, +/-2014)"),
      baseWhiskyName("Macallan 12 yo 'Gran Reserva' (45.6%, OB, for Taiwan, 2007)"),
    )
  })
})

describe('dedupeByBaseName', () => {
  it('keeps the first bottling of each whisky, in order', () => {
    const items = [
      { name: 'Lagavulin 16 yo (43%, OB, +/- 2013)', id: 'a' },
      { name: 'Talisker 10 yo (45.8%, OB, +/-2019)', id: 'b' },
      { name: 'Lagavulin 16 yo (43%, OB, +/- 2021)', id: 'c' },
      { name: 'Talisker 10 yo (45.8%, OB, +/-2019)', id: 'd' },
    ]
    assert.deepEqual(dedupeByBaseName(items).map((item) => item.id), ['a', 'b'])
  })
})
