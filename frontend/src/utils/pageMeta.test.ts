import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  HOME_META,
  SOMMELIER_META,
  WHISKIES_META,
  AUCTIONS_META,
  auctionPageMeta,
  canonicalUrl,
  whiskyPageMeta,
} from './pageMeta.ts'

describe('canonicalUrl', () => {
  it('uses the production domain for the home page', () => {
    assert.equal(canonicalUrl('/'), 'https://whiskyhello.com/')
    assert.equal(canonicalUrl(''), 'https://whiskyhello.com/')
  })

  it('drops query, hash, trailing and duplicate slashes', () => {
    for (const path of ['/whiskies', '/whiskies/', '/whiskies?q=macallan', '/whiskies#top', '//whiskies//', '/Whiskies']) {
      assert.equal(canonicalUrl(path), 'https://whiskyhello.com/whiskies', path)
    }
    assert.equal(canonicalUrl('/whiskies/12/?ref=x'), 'https://whiskyhello.com/whiskies/12')
  })
})

describe('page meta', () => {
  it('gives each public page its own title and description', () => {
    const pages = [HOME_META, SOMMELIER_META, WHISKIES_META, AUCTIONS_META]
    assert.equal(new Set(pages.map((page) => page.title)).size, pages.length)
    assert.equal(new Set(pages.map((page) => page.description)).size, pages.length)
  })

  it('builds whisky meta from the whisky data only', () => {
    const meta = whiskyPageMeta({
      id: '1',
      name: 'Macallan 12 yo',
      subtitle: '(40%, OB, 2020)',
      points: 82,
      note: 'Nose: sherry.',
    })
    assert.equal(meta.title, 'Macallan 12 yo 評價與風味｜WhiskyHello')
    assert.equal(
      meta.description,
      'Macallan 12 yo (40%, OB, 2020) 的評價與風味：知名評論家評分 82 分，附品飲筆記，也看看酒友怎麼評價。',
    )
  })

  it('leaves out facts the whisky does not have', () => {
    const meta = whiskyPageMeta({ id: '2', name: 'Ardbeg 10 yo' })
    assert.equal(meta.description, 'Ardbeg 10 yo 的評價與風味，也看看酒友怎麼評價。')
  })

  it('keeps long whisky descriptions short', () => {
    const meta = whiskyPageMeta({ id: '3', name: 'Long'.repeat(60), points: 90 })
    assert.ok(meta.description.length <= 150)
    assert.ok(meta.description.includes('知名評論家評分 90 分'))
  })

  it('builds auction meta from the auction', () => {
    const meta = auctionPageMeta('Macallan 18 稀有競標', 'Macallan 18 yo', 12000)
    assert.equal(meta.title, 'Macallan 18 稀有競標｜威士忌拍賣｜WhiskyHello')
    assert.ok(meta.description.includes('起標價 NT$12,000'))
  })
})
