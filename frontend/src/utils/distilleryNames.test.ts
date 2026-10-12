import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { chineseDistilleryName } from './distilleryNames.ts'

describe('chineseDistilleryName', () => {
  it('finds the distillery a whisky name starts with', () => {
    assert.equal(chineseDistilleryName('Ardbeg 10 yo'), '雅柏')
    assert.equal(chineseDistilleryName('Macallan Fine Oak 12 yo'), '麥卡倫')
    assert.equal(chineseDistilleryName('Highland Park 18 yo'), '高原騎士')
  })

  it('ignores case, extra spaces and hyphenated old names', () => {
    assert.equal(chineseDistilleryName('  caol  ila 12 yo'), '卡爾里拉')
    assert.equal(chineseDistilleryName('Aberlour-Glenlivet 1970'), '亞伯樂')
  })

  it('prefers the longest listed name', () => {
    assert.equal(chineseDistilleryName('Isle of Jura 16 yo'), '吉拉')
    assert.equal(chineseDistilleryName('Port Charlotte 10 yo'), '波夏')
    assert.equal(chineseDistilleryName('Glen Grant 10 yo'), '格蘭冠')
  })

  it('does not match a longer word or an unlisted distillery', () => {
    assert.equal(chineseDistilleryName('Obanish 12 yo'), undefined)
    assert.equal(chineseDistilleryName('Caroni 1996'), undefined)
    assert.equal(chineseDistilleryName('Glen Keith 20 yo'), undefined)
    assert.equal(chineseDistilleryName(''), undefined)
  })
})
