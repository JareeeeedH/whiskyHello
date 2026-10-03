/**
 * Homepage whisky news.
 * Static dataset of real articles. Swap for GET /api/v1/news/latest
 * when the News backend is ready.
 */
import type { WhiskyNews } from '../types/news'

export const whiskyNews: WhiskyNews[] = [
  {
    id: 'news-wa-ardrishaig-holyrood-2026-10-02',
    title:
      "News Notes: New Scotch Whisky Distillery Gets Approval, Holyrood's Production Pause & More",
    source: 'Whisky Advocate',
    url: 'https://whiskyadvocate.com/whisky-news-october-2-2026',
    publishedAt: '2026-10-02T12:00:00.000Z',
    imageUrl:
      'https://whiskyadvocate.com/get/files/image/galleries/holyrood-entrance-hero.jpg',
    category: 'industry',
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
    id: 'news-tww-dalmore-cigar-malt-18',
    title: 'The Dalmore Cigar Malt 18 Year Old Joins Principal Collection',
    source: 'The Whiskey Wash',
    url: 'https://thewhiskeywash.com/whiskey-news/the-dalmore-cigar-malt-18-year-old-joins-principal-collection/',
    publishedAt: '2026-10-02T11:23:22.000Z',
    imageUrl:
      'https://thewhiskeywash.com/wp-content/uploads/2026/10/the-dalmore-cigar-malt-18-year-old-joins-principal-collection.webp',
    category: 'release',
  },
  {
    id: 'news-tww-king-of-kentucky-2026',
    title: 'Brown-Forman Announces King of Kentucky 2026 Single Barrel Bourbon',
    source: 'The Whiskey Wash',
    url: 'https://thewhiskeywash.com/whiskey-news/brown-forman-announces-king-of-kentucky-2026-single-barrel-bourbon/',
    publishedAt: '2026-10-02T07:37:13.000Z',
    imageUrl:
      'https://thewhiskeywash.com/wp-content/uploads/2026/10/brown-forman-announces-king-of-kentucky-2026-single-barrel-bourbon.webp',
    category: 'release',
  },
  {
    id: 'news-wa-whiskyfest-ny-2026',
    title: 'WhiskyFest New York: The Ultimate Tasting Experience',
    source: 'Whisky Advocate',
    url: 'https://whiskyadvocate.com/whiskyfest-new-york-2026-ticket-options',
    publishedAt: '2026-10-01T12:00:00.000Z',
    imageUrl:
      'https://whiskyadvocate.com/get/files/image/galleries/Whiskyfest2025_nyc_ss-7063-SHANNON-STURGIS-hero.jpg',
    category: 'community',
  },
  {
    id: 'news-tww-exploring-english-whisky-explorer-2',
    title: 'Exploring English Whisky Launches 2nd Explorer Series Bottling',
    source: 'The Whiskey Wash',
    url: 'https://thewhiskeywash.com/whiskey-news/exploring-english-whisky-launches-2nd-explorer-series-bottling/',
    publishedAt: '2026-10-01T09:33:31.000Z',
    imageUrl:
      'https://thewhiskeywash.com/wp-content/uploads/2026/10/exploring-english-whisky-launches-2nd-explorer-series-bottling.webp',
    category: 'release',
  },
  {
    id: 'news-tww-lost-lantern-dickel-2026',
    title: 'Lost Lantern Unveils George Dickel Single-Distillery Range',
    source: 'The Whiskey Wash',
    url: 'https://thewhiskeywash.com/whiskey-news/lost-lantern-unveils-george-dickel-single-distillery-range/',
    publishedAt: '2026-09-30T09:35:30.000Z',
    imageUrl:
      'https://thewhiskeywash.com/wp-content/uploads/2026/09/lost-lantern-unveils-george-dickel-single-distillery-range.png',
    category: 'release',
  },
  {
    id: 'news-tww-macallan-carta-nautica',
    title:
      'The Macallan launches Carta Nautica Including 38-Year-Old 1987 & 20 Year Old',
    source: 'The Whiskey Wash',
    url: 'https://thewhiskeywash.com/whiskey-news/the-macallan-launches-carta-nautica-including-38-year-old-1987-20-year-old/',
    publishedAt: '2026-09-29T10:44:24.000Z',
    imageUrl:
      'https://thewhiskeywash.com/wp-content/uploads/2026/09/the-macallan-launches-carta-nautica-including-38-year-old-1987-_-20-year-old.webp',
    category: 'release',
  },
  {
    id: 'news-tww-angels-envy-cellar-vol-6',
    title:
      'Angel’s Envy Unveils Cellar Collection Vol. 6 Finished in Peach Brandy & Toasted Oak',
    source: 'The Whiskey Wash',
    url: 'https://thewhiskeywash.com/whiskey-news/angels-envy-unveils-cellar-collection-vol-6-finished-in-peach-brandy-toasted-oak/',
    publishedAt: '2026-09-28T16:06:10.000Z',
    imageUrl:
      'https://thewhiskeywash.com/wp-content/uploads/2026/09/angel_s-envy-unveils-cellar-collection-vol.-6-finished-in-peach-brandy-_-toasted-oak.webp',
    category: 'release',
  },
  {
    id: 'news-wa-whisky-watch-2026-09-25',
    title:
      'Whisky Watch: New Releases From Highland Park, Macallan, Willett, Widow Jane, & More',
    source: 'Whisky Advocate',
    url: 'https://whiskyadvocate.com/willett-reserve-cask-strength-compass-box-10-and-more-new-whisky',
    publishedAt: '2026-09-25T12:00:00.000Z',
    imageUrl:
      'https://whiskyadvocate.com/get/files/image/galleries/highland-park-btwn-you-and-i-II-hero.jpg',
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
