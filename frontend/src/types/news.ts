/** Whisky news item — mock now; later from GET /api/v1/news/latest */
export type WhiskyNewsCategory =
  | 'news'
  | 'release'
  | 'industry'
  | 'distillery'
  | 'community'

export interface WhiskyNews {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  imageUrl?: string
  category: WhiskyNewsCategory
}
