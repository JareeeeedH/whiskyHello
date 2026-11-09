/**
 * Homepage whisky news.
 * Static dataset of real articles. Swap for GET /api/v1/news/latest
 * when the News backend is ready.
 */
import type { WhiskyNews } from '../types/news'

export const whiskyNews: WhiskyNews[] = [
  {
    id: 'news-indri-secures-top-three-positions-at-international-whisky-co',
    title: 'Indri secures top three positions at International Whisky Competition – Indian Whisky News',
    source: 'Whisky Intelligence',
    url: 'https://www.whiskyintelligence.com/2026/11/indri-secures-top-three-positions-at-international-whisky-competition-indian-whisky-news/',
    publishedAt: '2026-11-08T07:00:28.000Z',
    imageUrl: 'https://www.whiskyintelligence.com/wp-content/uploads/2023/07/Indri.png',
    category: 'community',
  },
  {
    id: 'news-akkeshi-gyorei-ana-duty-free-hokusai',
    title: 'Akkeshi’s Red Fuji single malt is sold only on ANA flights',
    source: 'Japan Whisky Press',
    url: 'https://japanwhiskypress.com/news-akkeshi-gyorei-ana-duty-free-hokusai/',
    publishedAt: '2026-11-08T03:23:21.000Z',
    imageUrl: 'https://japanwhiskypress.com/wp-content/uploads/2026/11/news-akkeshi-gyorei-ana-duty-free-hokusai.jpg',
    category: 'release',
  },
  {
    id: 'news-saburomaru-ace-of-wands-single-cask',
    title: 'Saburomaru’s Ace of Wands opens a new single cask series',
    source: 'Japan Whisky Press',
    url: 'https://japanwhiskypress.com/news-saburomaru-ace-of-wands-single-cask/',
    publishedAt: '2026-11-08T03:20:36.000Z',
    imageUrl: 'https://japanwhiskypress.com/wp-content/uploads/2026/11/news-saburomaru-ace-of-wands-single-cask.jpg',
    category: 'release',
  },
  {
    id: 'news-hinomaru-whisky-2027-edition-kiuchi-yasato',
    title: 'Hinomaru Whisky 2027 Editions pair Ibaraki wheat and sherry',
    source: 'Japan Whisky Press',
    url: 'https://japanwhiskypress.com/news-hinomaru-whisky-2027-edition-kiuchi-yasato/',
    publishedAt: '2026-11-08T03:14:38.000Z',
    imageUrl: 'https://japanwhiskypress.com/wp-content/uploads/2026/11/news-hinomaru-whisky-2027-edition-kiuchi-yasato.jpg',
    category: 'release',
  },
  {
    id: 'news-macallan-a-night-on-earth-the-finale-at-the-whisky-shop-scot',
    title: 'Macallan: A Night on Earth The Finale at The Whisky Shop – Scotch Whisky News',
    source: 'Whisky Intelligence',
    url: 'https://www.whiskyintelligence.com/2026/11/macallan-a-night-on-earth-the-finale-at-the-whisky-shop-scotch-whisky-news/',
    publishedAt: '2026-11-07T07:01:17.000Z',
    imageUrl: 'https://www.whiskyintelligence.com/wp-content/uploads/2023/07/TWS-1.png',
    category: 'release',
  },
  {
    id: 'news-suntory-price-rise-april-2027-yamazaki-hibiki',
    title: 'Suntory to raise Yamazaki and Hibiki prices in April 2027',
    source: 'Japan Whisky Press',
    url: 'https://japanwhiskypress.com/news-suntory-price-rise-april-2027-yamazaki-hibiki/',
    publishedAt: '2026-11-06T23:25:12.000Z',
    imageUrl: 'https://japanwhiskypress.com/wp-content/uploads/2026/11/news-suntory-price-rise-april-2027-yamazaki-hibiki.jpg',
    category: 'industry',
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
