/**
 * Homepage whisky news mock data (real articles).
 * Replace with GET /api/v1/news/latest when News backend is ready.
 */
import type { WhiskyNews } from '../types/news'

export const whiskyNews: WhiskyNews[] = [
  {
    id: 'news-wa-balvenie-88',
    title: "Balvenie Releases the World's Oldest Single Malt",
    source: 'Whisky Advocate',
    url: 'https://whiskyadvocate.com/balvenie-88-year-old',
    publishedAt: '2026-09-01T12:00:00.000Z',
    imageUrl:
      'https://whiskyadvocate.com/get/files/image/galleries/The-1931-Collection-Eighty-Eight-Year-Old-HERO.jpg',
    category: 'release',
  },
  {
    id: 'news-wa-parkers-heritage-2026',
    title:
      "Whisky Watch: Parker's Heritage 20th Edition, Penelope Cigar Sessions 2, Middle West Naranja Cask, Boss Hog's Latest & More",
    source: 'Whisky Advocate',
    url: 'https://whiskyadvocate.com/2026-parkers-heritage-kentucky-boy-and-more-new-whiskey',
    publishedAt: '2026-09-11T12:00:00.000Z',
    imageUrl:
      'https://whiskyadvocate.com/get/files/image/galleries/parkers-heritage-collection-2026-hero.jpg',
    category: 'release',
  },
  {
    id: 'news-wa-september-11-notes',
    title:
      "News Notes: Beam's New NFL Contest, Johnnie Walker Teams Up With Sabrina Carpenter",
    source: 'Whisky Advocate',
    url: 'https://whiskyadvocate.com/whiskey-news-september-11-2026',
    publishedAt: '2026-09-11T14:00:00.000Z',
    imageUrl:
      'https://whiskyadvocate.com/get/files/image/galleries/Untitled_September_11,_2026_at_06_08_23.png',
    category: 'industry',
  },
  {
    id: 'news-wa-ardbeg-trudernish',
    title:
      "Whisky Watch: Four Roses Limited Edition Small Batch, Baker's 13, Ardbeg 15, & More",
    source: 'Whisky Advocate',
    url: 'https://whiskyadvocate.com/four-roses-bakers-13-ardbeg-trudernish-and-more-new-whisky',
    publishedAt: '2026-09-04T12:00:00.000Z',
    imageUrl:
      'https://whiskyadvocate.com/get/files/image/galleries/ardbeg-trudernish-hero.jpg',
    category: 'release',
  },
  {
    id: 'news-tww-pappy-2026',
    title: 'Pappy Van Winkle 2026 Collection Release Revealed',
    source: 'The Whiskey Wash',
    url: 'https://thewhiskeywash.com/whiskey-news/pappy-van-winkle-2026-collection-release-revealed/',
    publishedAt: '2026-09-11T10:00:00.000Z',
    imageUrl:
      'https://thewhiskeywash.com/wp-content/uploads/2026/09/pappy-van-winkle-2026-collection-release-revealed.webp',
    category: 'release',
  },
  {
    id: 'news-tww-glenallachie-sinteis-iv',
    title: 'GlenAllachie Sinteis Part IV: Rare Mongolian Oak Single Malt',
    source: 'The Whiskey Wash',
    url: 'https://thewhiskeywash.com/whiskey-news/glenallachie-sinteis-part-iv-rare-mongolian-oak-single-malt/',
    publishedAt: '2026-09-10T12:00:00.000Z',
    imageUrl:
      'https://thewhiskeywash.com/wp-content/uploads/2026/09/glen-allachie-sinteis-part-i-v_-rare-mongolian-oak-single-malt.webp',
    category: 'release',
  },
  {
    id: 'news-tww-arbikie-signature',
    title: 'Arbikie The Signature: Debut Single Malt Scotch Whisky',
    source: 'The Whiskey Wash',
    url: 'https://thewhiskeywash.com/whiskey-news/arbikie-the-signature-debut-single-malt-scotch-whisky/',
    publishedAt: '2026-09-07T12:00:00.000Z',
    imageUrl:
      'https://thewhiskeywash.com/wp-content/uploads/2026/09/arbikie-the-signature_-debut-single-malt-scotch-whisky.webp',
    category: 'distillery',
  },
  {
    id: 'news-wm-icons-2026',
    title: 'Global results revealed in Icons of Whisky 2026',
    source: 'Whisky Magazine',
    url: 'https://whiskymag.com/articles/global-results-revealed-in-icons-of-whisky-2026/',
    publishedAt: '2026-03-25T12:00:00.000Z',
    imageUrl:
      'https://whiskymag.com/media/v5umqo3e/icons-backdrop_photo-3-1914x816.jpg',
    category: 'community',
  },
]

/** Full mock pool — homepage / future API consumer entry point. */
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
