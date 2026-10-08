import type { Whisky } from '../types/whisky.ts'

export const SITE_URL = 'https://whiskyhello.com'
export const SITE_NAME = 'WhiskyHello 威你好'
export const OG_IMAGE_URL = `${SITE_URL}/og-image.png`

/** Search results show roughly this many characters of a description. */
const DESCRIPTION_MAX_LENGTH = 150
const WHISKY_LABEL_MAX_LENGTH = 80

export interface PageMeta {
  title: string
  description: string
  /** Private and error pages: kept out of search results, with no canonical link. */
  noindex?: boolean
}

export const HOME_META: PageMeta = {
  title: '威士忌推薦｜WhiskyHello｜懂你的口味，找到下一杯威士忌',
  description: '從風味、預算與飲酒情境出發，與侍酒師聊聊，找到更適合你的威士忌。',
}

export const SOMMELIER_META: PageMeta = {
  title: '威士忌推薦｜與侍酒師聊聊你的口味｜WhiskyHello',
  description:
    '從你的風味偏好、預算與飲酒情境開始，與 WhiskyHello 侍酒師聊聊，探索適合你的威士忌方向。',
}

export const WHISKIES_META: PageMeta = {
  title: '探索威士忌｜酒款、品牌與評論｜WhiskyHello',
  description: '搜尋威士忌酒款、探索品牌與閱讀評論，從每一杯開始了解自己的口味。',
}

export const AUCTIONS_META: PageMeta = {
  title: '威士忌拍賣與競標｜稀有收藏酒款｜WhiskyHello',
  description: '探索限量、收藏與稀有威士忌競標，掌握出價、價格與結標結果。',
}

/** Shown while an auction is loading, before its own title is known. */
export const AUCTION_LOADING_META: PageMeta = {
  title: '威士忌競標｜WhiskyHello',
  description: AUCTIONS_META.description,
}

export const NOT_FOUND_META: PageMeta = {
  title: '找不到頁面｜WhiskyHello',
  description: '找不到這個頁面，回到 WhiskyHello 首頁繼續探索威士忌。',
  noindex: true,
}

export function privatePageMeta(title: string): PageMeta {
  return { title: `${title}｜WhiskyHello`, description: HOME_META.description, noindex: true }
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

/** Production URL for a route path, without query, hash, duplicate or trailing slashes. */
export function canonicalUrl(path: string): string {
  const pathname = (path.split(/[?#]/)[0] ?? '')
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/, '')
    .toLowerCase()
  return `${SITE_URL}${pathname || '/'}`
}

/** Built only from fields the dataset actually has; missing facts are left out. */
export function whiskyPageMeta(whisky: Whisky): PageMeta {
  const name = whisky.name.trim() || `酒款 #${whisky.id}`
  const label = truncate(whisky.subtitle ? `${name} ${whisky.subtitle}` : name, WHISKY_LABEL_MAX_LENGTH)
  const facts = [
    whisky.points !== undefined ? `知名評論家評分 ${whisky.points} 分` : '',
    whisky.note ? '附品飲筆記' : '',
  ].filter(Boolean)
  const factText = facts.length > 0 ? `：${facts.join('，')}` : ''

  return {
    title: `${name} 評價與風味｜WhiskyHello`,
    description: truncate(
      `${label} 的評價與風味${factText}，也看看酒友怎麼評價。`,
      DESCRIPTION_MAX_LENGTH,
    ),
  }
}

export function auctionPageMeta(
  auctionTitle: string,
  whiskyName: string,
  startingPrice: number,
): PageMeta {
  const price = startingPrice.toLocaleString('en-US')
  return {
    title: `${auctionTitle}｜威士忌拍賣｜WhiskyHello`,
    description: truncate(
      `${auctionTitle}（${whiskyName}）威士忌競標，起標價 NT$${price}，查看目前出價、倒數時間與結標結果。`,
      DESCRIPTION_MAX_LENGTH,
    ),
  }
}
