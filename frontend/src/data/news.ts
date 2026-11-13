/**
 * Homepage whisky news.
 * Static dataset of real articles. Swap for GET /api/v1/news/latest
 * when the News backend is ready.
 */
import type { WhiskyNews } from '../types/news'

export const whiskyNews: WhiskyNews[] = [
  {
    id: 'news-saburomaru-ix-the-hermit',
    title: 'Saburomaru IX The Hermit will be sold in Japan and overseas',
    source: 'Japan Whisky Press',
    url: 'https://japanwhiskypress.com/news-saburomaru-ix-the-hermit/',
    publishedAt: '2026-11-12T23:22:56.000Z',
    imageUrl: 'https://japanwhiskypress.com/wp-content/uploads/2026/11/news-saburomaru-ix-the-hermit.jpg',
    category: 'release',
  },
  {
    id: 'news-pursuit-spirits-honors-veterans-with-joint-operations-bourbo',
    title: 'Pursuit Spirits Honors Veterans With Joint Operations Bourbon',
    source: 'The Whiskey Wash',
    url: 'https://thewhiskeywash.com/whiskey-news/pursuit-spirits-honors-veterans-with-joint-operations-bourbon/',
    publishedAt: '2026-11-12T16:28:47.000Z',
    imageUrl: 'https://thewhiskeywash.com/wp-content/uploads/2026/11/pursuit-spirits-honors-veterans-with-joint-operations-bourbon.png',
    category: 'release',
  },
  {
    id: 'news-blue-note-bourbon-brings-back-17-year-barrel-proof-bourbon',
    title: 'Blue Note Bourbon Brings Back 17-Year Barrel Proof Bourbon',
    source: 'The Whiskey Wash',
    url: 'https://thewhiskeywash.com/whiskey-news/blue-note-bourbon-brings-back-17-year-barrel-proof-bourbon/',
    publishedAt: '2026-11-12T15:17:33.000Z',
    imageUrl: 'https://thewhiskeywash.com/wp-content/uploads/2026/11/blue-note-bourbon-brings-back-17-year-barrel-proof-bourbon.png',
    category: 'release',
  },
  {
    id: 'news-lagg-distillery-announces-quarter-cask-small-batch-single-ma',
    title: 'Lagg Distillery Announces Quarter Cask Small Batch Single Malt',
    source: 'The Whiskey Wash',
    url: 'https://thewhiskeywash.com/whiskey-news/lagg-distillery-announces-quarter-cask-small-batch-single-malt/',
    publishedAt: '2026-11-12T14:54:38.000Z',
    imageUrl: 'https://thewhiskeywash.com/wp-content/uploads/2026/11/lagg-distillery-announces-quarter-cask-small-batch-single-malt.png',
    category: 'release',
  },
  {
    id: 'news-nightcap-totals-14-3-illion-at-sothebys-new-york-auction-whi',
    title: 'NIGHTCAP TOTALS $14.3 MILLION AT SOTHEBY’S NEW YORK – Auction Whisky News',
    source: 'Whisky Intelligence',
    url: 'https://www.whiskyintelligence.com/2026/11/nightcap-totals-14-3-illion-at-sothebys-new-york-auction-whisky-news/',
    publishedAt: '2026-11-12T07:04:21.000Z',
    imageUrl: 'https://www.whiskyintelligence.com/wp-content/uploads/2020/11/Sothebys-1.jpg',
    category: 'industry',
  },
  {
    id: 'news-whisky-ambassador-certification-saturday-november-28-2026-to',
    title: 'Whisky Ambassador Certification Saturday, November 28, 2026 Toronto – Whisky Education News',
    source: 'Whisky Intelligence',
    url: 'https://www.whiskyintelligence.com/2026/11/whisky-ambassador-certification-saturday-november-28-2026-toronto-whisky-education-news/',
    publishedAt: '2026-11-12T07:03:34.000Z',
    imageUrl: 'https://www.whiskyintelligence.com/wp-content/uploads/2026/11/Ig1.jpg',
    category: 'community',
  },
  {
    id: 'news-38carta-nautica',
    title: '麥卡倫38年威士忌亮相！全新Carta Nautica系列，首席釀酒師來台揭雙桶熟成秘密',
    source: 'ELLE Taiwan',
    url: 'https://www.elle.com/tw/life/foodie/g74339703/38carta-nautica/',
    publishedAt: '2026-11-05T11:53:00.000Z',
    imageUrl: 'https://hips.hearstapps.com/hmg-prod/images/b61188b1-c6f8-463f-8fa5-da450f22672c.jpg',
    category: 'release',
  },
  {
    id: 'news-kavalan-choi-si-won',
    title: '崔始源×噶瑪蘭聯名「FINO雪莉桶」11/5開賣！親筆簽名酒標、售價及通路一次看',
    source: 'ELLE Taiwan',
    url: 'https://www.elle.com/tw/life/hot-news/g74318874/kavalan-choi-si-won/',
    publishedAt: '2026-11-03T08:08:00.000Z',
    imageUrl: 'https://hips.hearstapps.com/hmg-prod/images/3195b43a-42e0-41c6-a83c-6e40da67c876.jpg',
    category: 'release',
  },
  {
    id: 'news-stufftaiwan-royal-salute-21-polo-desert',
    title: '奢選PX雪莉桶過桶18個月！皇家禮炮21年馬球系列第八代「流金沙漠限定版」上市',
    source: 'Stuff Taiwan',
    url: 'https://www.stufftaiwan.com/2026/10/22/%E5%A5%A2%E9%81%B8px%E9%9B%AA%E8%8E%89%E6%A1%B6%E9%81%8E%E6%A1%B618%E5%80%8B%E6%9C%88%EF%BC%81%E7%9A%87%E5%AE%B6%E7%A6%AE%E7%82%AE21%E5%B9%B4%E9%A6%AC%E7%90%83%E7%B3%BB%E5%88%97%E7%AC%AC%E5%85%AB/',
    publishedAt: '2026-10-21T16:07:58.000Z',
    imageUrl: 'https://media.stufftaiwan.com/wp-content/uploads/2026/10/20185329/royalsalute1021-0a.jpg',
    category: 'release',
  },
  {
    id: 'news-marieclaire-autumn-whisky-2026',
    title: '2026秋季酒款推薦｜威士忌們大展身手的季節：軒尼詩Artistry重返臺北、皇家禮炮全新流金沙漠、林宥嘉代言蘇格登',
    source: 'Marie Claire 美麗佳人',
    url: 'https://www.marieclaire.com.tw/lifestyle/taste/95610',
    publishedAt: '2026-10-20T12:47:00.000Z',
    imageUrl: 'https://ia.marieclaire.com.tw/assets/mc/202610/6AD7610E704331792499982.jpeg',
    category: 'release',
  },
]

/** Full static pool. Homepage draws a random subset with getRandomNews. */
export const newsItems: WhiskyNews[] = [...whiskyNews]

/** Pick `limit` distinct items at random from the news pool. */
export function getRandomNews(limit = 3): WhiskyNews[] {
  const pool = [...newsItems]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, Math.min(limit, pool.length))
}
