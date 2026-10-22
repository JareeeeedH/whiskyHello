/**
 * Homepage whisky news.
 * Static dataset of real articles. Swap for GET /api/v1/news/latest
 * when the News backend is ready.
 */
import type { WhiskyNews } from '../types/news'

export const whiskyNews: WhiskyNews[] = [
  {
    id: 'news-jwp-fugaku-2028-debut',
    title: 'Fugaku distillery near Mt. Fuji targets a 2028 debut',
    source: 'Japan Whisky Press',
    url: 'https://japanwhiskypress.com/news-fugaku-distillery-fujiyoshida-2028-debut/',
    publishedAt: '2026-10-21T23:24:40.000Z',
    imageUrl: 'https://japanwhiskypress.com/wp-content/uploads/2026/10/news-fugaku-distillery-fujiyoshida-2028-debut.jpg',
    category: 'distillery',
  },
  {
    id: 'news-whiskymag-fr-macallan-residence',
    title: 'Whisky : The Macallan fait le mur',
    source: 'Whisky Mag (France)',
    url: 'https://www.whiskymag.fr/whisky-the-macallan-fait-le-mur/',
    publishedAt: '2026-10-21T16:24:05.000Z',
    imageUrl: 'https://www.whiskymag.fr/wp-content/uploads/2026/10/Macallan-en-residence-enseigne.jpeg',
    category: 'community',
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
    id: 'news-tsb-wyoming-whiskey-interview',
    title: 'The big interview: Wyoming Whiskey',
    source: 'The Spirits Business',
    url: 'https://www.thespiritsbusiness.com/2026/10/the-big-interview-wyoming-whiskey/',
    publishedAt: '2026-10-21T11:37:19.000Z',
    imageUrl: 'https://www.thespiritsbusiness.com/content/uploads/2026/10/David-DeFazio-Wyoming-Whiskey.png',
    category: 'industry',
  },
  {
    id: 'news-tsb-isle-of-raasay-full-monti',
    title: 'Isle of Raasay goes The Full Monti',
    source: 'The Spirits Business',
    url: 'https://www.thespiritsbusiness.com/2026/10/isle-of-raasay-goes-the-full-monti/',
    publishedAt: '2026-10-21T10:06:05.000Z',
    imageUrl: 'https://www.thespiritsbusiness.com/content/uploads/2026/10/Isle-of-Raasay-The-Full-Monti.jpg',
    category: 'release',
  },
  {
    id: 'news-tsb-jameson-ultimate-matchday',
    title: 'Jameson offers grassroots footballers the ‘ultimate matchday’',
    source: 'The Spirits Business',
    url: 'https://www.thespiritsbusiness.com/2026/10/jameson-offers-grassroots-footballers-the-ultimate-matchday/',
    publishedAt: '2026-10-21T09:52:41.000Z',
    imageUrl: 'https://www.thespiritsbusiness.com/content/uploads/2026/10/Jameson-2.png',
    category: 'community',
  },
  {
    id: 'news-tsb-archie-rose-us-launch',
    title: 'Chris Hemsworth fronts Archie Rose campaign for US launch',
    source: 'The Spirits Business',
    url: 'https://www.thespiritsbusiness.com/2026/10/chris-hemsworth-fronts-archie-rose-campaign-for-us-launch/',
    publishedAt: '2026-10-21T09:18:44.000Z',
    imageUrl: 'https://www.thespiritsbusiness.com/content/uploads/2026/10/Hemsworth-1.png',
    category: 'release',
  },
  {
    id: 'news-dii-cashel-palace-pot-still',
    title: 'Cashel Palace Hotel unveils signature Irish Pot Still Whiskey distilled by Tipperary Boutique Distillery',
    source: 'Drinks Industry Ireland',
    url: 'https://www.drinksindustryireland.ie/cashel-palace-hotel-unveils-signature-irish-pot-still-whiskey/',
    publishedAt: '2026-10-21T00:00:00.000Z',
    imageUrl: 'https://www.drinksindustryireland.ie/wp-content/uploads/2026/10/Cashel-Palace-Whiskey-768x960.jpg',
    category: 'release',
  },
  {
    id: 'news-jwp-nikka-taketsuru-frontier',
    title: 'Nikka sends Taketsuru Essentials to US, Frontier to UK',
    source: 'Japan Whisky Press',
    url: 'https://japanwhiskypress.com/news-nikka-taketsuru-essentials-us-frontier-uk/',
    publishedAt: '2026-10-20T23:23:10.000Z',
    imageUrl: 'https://japanwhiskypress.com/wp-content/uploads/2026/10/news-nikka-taketsuru-essentials-us-frontier-uk.jpg',
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
  {
    id: 'news-tsb-uncle-nearest-bond-dispute',
    title: 'Uncle Nearest founder fights $60m bond in sale dispute',
    source: 'The Spirits Business',
    url: 'https://www.thespiritsbusiness.com/2026/10/uncle-nearest-founder-fights-60m-bond-in-sale-dispute/',
    publishedAt: '2026-10-20T11:50:39.000Z',
    imageUrl: 'https://www.thespiritsbusiness.com/content/uploads/2026/03/Fawn-Weaver-Uncle-Nearest-CEO-2.jpg',
    category: 'industry',
  },
  {
    id: 'news-jwp-japanese-whisky-under-50',
    title: 'Japanese whisky under $50 that is actually Japanese',
    source: 'Japan Whisky Press',
    url: 'https://japanwhiskypress.com/japanese-whisky-under-50-dollars/',
    publishedAt: '2026-10-20T06:17:52.000Z',
    imageUrl: 'https://japanwhiskypress.com/wp-content/uploads/2026/10/whisky-glass-ice-slate-coaster.jpg',
    category: 'news',
  },
  {
    id: 'news-tsb-elijah-craig-old-fashioned-week',
    title: 'Bourbon, bartenders and a good cause: Elijah Craig’s Old Fashioned Week',
    source: 'The Spirits Business',
    url: 'https://www.thespiritsbusiness.com/2026/10/bourbon-bartenders-good-cause-elijah-craig/',
    publishedAt: '2026-10-19T09:05:44.000Z',
    imageUrl: 'https://www.thespiritsbusiness.com/content/uploads/2026/10/Elijah-Craig-Old-Fashioned-Week.jpg',
    category: 'community',
  },
  {
    id: 'news-drinkstrade-hellyers-road-dmg',
    title: 'Hellyers Road appoints DMG Fine Wine as distribution partner',
    source: 'Drinks Trade',
    url: 'https://www.drinkstrade.com.au/news/hellyers-road-appoints-dmg-fine-wine-as-distribution-partner/',
    publishedAt: '2026-10-19T00:00:00.000Z',
    imageUrl: 'https://www.drinkstrade.com.au/media/images/HRD_Staff_May_2026.max-1200x630.jpg',
    category: 'distillery',
  },
  {
    id: 'news-jwp-kanosuke-festival-2026',
    title: 'Kanosuke festival returns October 25 with a hand-fill cask',
    source: 'Japan Whisky Press',
    url: 'https://japanwhiskypress.com/news-kanosuke-hioki-distillery-festival-2026/',
    publishedAt: '2026-10-18T23:23:37.000Z',
    imageUrl: 'https://japanwhiskypress.com/wp-content/uploads/2026/10/news-kanosuke-hioki-distillery-festival-2026.jpg',
    category: 'community',
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
