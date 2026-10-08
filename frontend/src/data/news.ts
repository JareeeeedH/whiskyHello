/**
 * Homepage whisky news.
 * Static dataset of real articles. Swap for GET /api/v1/news/latest
 * when the News backend is ready.
 */
import type { WhiskyNews } from '../types/news'

export const whiskyNews: WhiskyNews[] = [
  {
    id: 'news-tsb-english-whisky-gi-challenge',
    title: 'English distillers challenge whisky GI',
    source: 'The Spirits Business',
    url: 'https://www.thespiritsbusiness.com/2026/10/english-distillers-challenge-whisky-gi/',
    publishedAt: '2026-10-08T11:15:56.000Z',
    imageUrl:
      'https://www.thespiritsbusiness.com/content/uploads/2026/10/cover-650-%C3%97-410px-9.jpg',
    category: 'industry',
  },
  {
    id: 'news-tsb-woodford-reserve-30-years',
    title: 'Woodford Reserve marks 30 years with special releases',
    source: 'The Spirits Business',
    url: 'https://www.thespiritsbusiness.com/2026/10/woodford-reserve-marks-30-years-with-special-releases/',
    publishedAt: '2026-10-08T08:36:32.000Z',
    imageUrl:
      'https://www.thespiritsbusiness.com/content/uploads/2026/10/Woodford-Reserve-30th-anniversary-edition.jpg',
    category: 'release',
  },
  {
    id: 'news-drinkstrade-gospel-bottled-in-bond',
    title: 'The Gospel launches Bottled-in-Bond whiskey',
    source: 'Drinks Trade',
    url: 'https://www.drinkstrade.com.au/news/the-gospel-launches-bottled-in-bond-whiskey/',
    publishedAt: '2026-10-08T03:14:28.000Z',
    imageUrl:
      'https://www.drinkstrade.com.au/media/images/TG_Bonded_Rye_GB_Hero_7_1.max-1200x630.jpg',
    category: 'release',
  },
  {
    id: 'news-jwp-kanosuke-mellow-blend',
    title: 'Kanosuke launches Mellow Blend as an everyday house whisky',
    source: 'Japan Whisky Press',
    url: 'https://japanwhiskypress.com/news-kanosuke-mellow-blend-launch/',
    publishedAt: '2026-10-07T23:09:20.000Z',
    imageUrl:
      'https://japanwhiskypress.com/wp-content/uploads/2026/10/news-kanosuke-mellow-blend-launch.jpg',
    category: 'release',
  },
  {
    id: 'news-prn-yamazaki-25-isc-2026',
    title:
      "The House of Suntory's Yamazaki 25 Years Old Awarded Trophy in the Japanese Whisky Category at International Spirits Challenge 2026 and Suntory Spirits Named Japanese Whisky Producer of the Year",
    source: 'PR Newswire',
    url: 'https://www.prnewswire.com/news-releases/the-house-of-suntorys-yamazaki-25-years-old-awarded-trophy-in-the-japanese-whisky-category-at-international-spirits-challenge-2026-and-suntory-spirits-named-japanese-whisky-producer-of-the-year-302901296.html',
    publishedAt: '2026-10-07T15:00:00.000Z',
    imageUrl:
      'https://mmx.prnewswire.com/media/MS2004208/Suntory-Global-Spirits-Awarded.jpg?id=OA2992309&p=facebook',
    category: 'community',
  },
  {
    id: 'news-prn-kavalan-cerbaco-australia',
    title: "Kavalan Appoints Australia's Cerbaco Distribution to Drive New Era of Growth",
    source: 'PR Newswire',
    url: 'https://www.prnewswire.com/apac/news-releases/kavalan-appoints-australias-cerbaco-distribution-to-drive-new-era-of-growth-302899665.html',
    publishedAt: '2026-10-06T21:00:00.000Z',
    imageUrl:
      'https://mmx.prnewswire.com/media/MS2002146/20261005021846EDT_image_1.jpg?id=OA2986511&p=facebook',
    category: 'distillery',
  },
  {
    id: 'news-tdb-macallan-cask-263',
    title: 'Million-pound Macallan: the legend of cask 263',
    source: 'The Drinks Business',
    url: 'https://www.thedrinksbusiness.com/2026/10/million-pound-macallan-the-legend-of-cask-263/',
    publishedAt: '2026-10-06T09:00:00.000Z',
    category: 'news',
  },
  {
    id: 'news-tsb-glenwyvis-administrators',
    title: 'GlenWyvis Distillery appoints joint administrators',
    source: 'The Spirits Business',
    url: 'https://www.thespiritsbusiness.com/2026/10/glenwyvis-distillery-appoints-joint-administrators/',
    publishedAt: '2026-10-06T11:06:02.000Z',
    imageUrl: 'https://www.thespiritsbusiness.com/content/uploads/2026/02/GlenWyvis.jpg',
    category: 'distillery',
  },
  {
    id: 'news-whiskymag-fr-ig-whisky-de-france',
    title: 'A quoi peut bien servir une IG “whisky de France” et autres questions',
    source: 'Whisky Mag (France)',
    url: 'https://www.whiskymag.fr/a-quoi-peut-bien-servir-une-ig-whisky-de-france-et-autres-questions/',
    publishedAt: '2026-10-06T04:52:30.000Z',
    imageUrl:
      'https://www.whiskymag.fr/wp-content/uploads/2026/10/federation-whisky-de-France.png',
    category: 'news',
  },
  {
    id: 'news-windsorstar-hiram-walker-whisky-weekend',
    title: 'Windsor whisky lovers get rare look inside Hiram Walker distillery',
    source: 'Windsor Star',
    url: 'https://windsorstar.com/news/behind-the-whisky-hiram-walker-opens-its-doors-to-windsor-enthusiasts/',
    publishedAt: '2026-10-06T04:33:00.000Z',
    imageUrl:
      'https://windsorstar.com/wp-content/uploads/sites/10/2026/10/whisky-1_305565113-1.jpg',
    category: 'community',
  },
  {
    id: 'news-drinkstrade-lark-chris-thomson',
    title: 'Chris Thomson to leave Lark Distilling after nearly 20 years',
    source: 'Drinks Trade',
    url: 'https://www.drinkstrade.com.au/news/chris-thomson-to-leave-lark-distilling-after-nearly-20-years/',
    publishedAt: '2026-10-05T20:39:49.000Z',
    imageUrl:
      'https://www.drinkstrade.com.au/media/images/Bill_Lark__Chris_Thomson_2.max-1200x630_eSAejtT.jpg',
    category: 'distillery',
  },
  {
    id: 'news-tdb-scotch-prices-india',
    title: 'Scotch prices fall in India after UK trade deal',
    source: 'The Drinks Business',
    url: 'https://www.thedrinksbusiness.com/2026/10/scotch-prices-fall-in-india-after-uk-trade-deal/',
    publishedAt: '2026-10-05T09:00:00.000Z',
    category: 'industry',
  },
  {
    id: 'news-ctee-glenfiddich-16-aston-martin-2',
    title: '格蘭菲迪Aston Martin Formula One Team再度攜手 16年聯名新品全台限量上市',
    source: '工商時報',
    url: 'https://www.ctee.com.tw/news/20261005701426-431207',
    publishedAt: '2026-10-05T08:01:48.000Z',
    imageUrl: 'https://images.ctee.com.tw/newsphoto/2026-10-05/1024/20261005701431.jpg',
    category: 'release',
  },
  {
    id: 'news-wa-auction-september-2026',
    title:
      'Auction Update: The 20 Highest Single Bottle Hammer Prices for September',
    source: 'Whisky Advocate',
    url: 'https://whiskyadvocate.com/20-highest-single-bottle-whisky-auction-sales-september-2026',
    publishedAt: '2026-10-02T12:00:00.000Z',
    imageUrl:
      'https://whiskyadvocate.com/get/files/image/galleries/bowmore-arc-54-hero.jpg',
    category: 'industry',
  },
  {
    id: 'news-cityam-awash-with-whiskey',
    title: 'Awash With Whisk(e)y',
    source: 'City AM',
    url: 'https://www.cityam.com/awash-with-whiskey/',
    publishedAt: '2026-10-02T09:05:43.000Z',
    imageUrl:
      'https://www.cityam.com/wp-content/uploads/2026/10/de39de45-466f-4e27-a16f-1e88c5e48635-e1790931933333.jpg',
    category: 'industry',
  },
  {
    id: 'news-jwp-japanese-whisky-cask-types',
    title: 'Japanese whisky cask types: what distilleries actually use',
    source: 'Japan Whisky Press',
    url: 'https://japanwhiskypress.com/japanese-whisky-cask-types/',
    publishedAt: '2026-10-01T15:04:41.000Z',
    imageUrl:
      'https://japanwhiskypress.com/wp-content/uploads/2026/10/oak-barrels-cellar-aisle.jpg',
    category: 'news',
  },
  {
    id: 'news-caskid-angels-share',
    title: "The Angel's Share: How Much Whisky Evaporates From a Cask?",
    source: 'CaskID',
    url: 'https://cask.id/articles/angels-share-whisky-cask-evaporation-explained',
    publishedAt: '2026-10-01T15:49:42.000Z',
    imageUrl:
      'https://uvfkwjstmlzlynjzkzyv.supabase.co/storage/v1/object/public/article-images/angels-share-whisky-cask-evaporation-explained-1790869780137.jpeg',
    category: 'news',
  },
  {
    id: 'news-suntory-hibiki-chiso-limited-edition',
    title:
      'The House of Suntory Unveils Hibiki® Japanese Harmony Limited-Edition Designed in Collaboration with Legendary Kimono House Chiso',
    source: 'Suntory Global Spirits',
    url: 'https://www.suntoryglobalspirits.com/news/house-suntory-unveils-hibikir-japanese-harmony-limited-edition-designed-collaboration',
    publishedAt: '2026-10-01T13:00:00.000Z',
    imageUrl:
      'https://www.suntoryglobalspirits.com/sites/default/files/2026-10/HibikiJapaneseHarmony-Limited-Edition-Chiso-Collaboration.jpg',
    category: 'release',
  },
  {
    id: 'news-cbc-us-bans-canadian-whisky',
    title: "U.S. bans on Canadian booze hit producers on one of trade war's thorniest fronts",
    source: 'CBC News',
    url: 'https://www.cbc.ca/news/business/us-canadian-booze-ban-whisky-wine-beer-9.7361385',
    publishedAt: '2026-09-29T08:00:00.000Z',
    category: 'industry',
  },
  {
    id: 'news-dii-next-chapter-irish-whiskey',
    title: 'The next chapter for Irish Whiskey',
    source: 'Drinks Industry Ireland',
    url: 'https://www.drinksindustryireland.ie/the-next-chapter-for-irish-whiskey/',
    publishedAt: '2026-09-28T09:00:00.000Z',
    imageUrl:
      'https://www.drinksindustryireland.ie/wp-content/uploads/2026/09/pexels-lazaro-rodriguez-jr-11199025-6359110-768x960.jpg',
    category: 'industry',
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
