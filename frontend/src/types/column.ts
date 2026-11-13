/** Whisky column article — static JSON from the whisky-column-agent project (WHISKYHELLO_COLUMN_SPEC.md). */
export type ColumnType =
  | 'recommendation'
  | 'comparison'
  | 'guide'
  | 'review'
  | 'distillery'
  | 'howto'

/** Body is stored as blocks so it renders with Vue templates, never v-html. */
export type ColumnBlock =
  | { type: 'heading'; text: string }
  /** May contain **bold** spans. */
  | { type: 'paragraph'; text: string }

export interface ColumnCover {
  /** Linked from the original site, not downloaded. */
  imageUrl: string
  sourceUrl: string
  credit: string
}

export interface ColumnSource {
  title: string
  url: string
}

export interface WhiskyColumn {
  /** English slug used in the URL; never changes after publishing. */
  id: string
  title: string
  type: ColumnType
  /** One sentence for cards and the meta description. */
  description: string
  publishedAt: string
  readingMinutes: number
  cover?: ColumnCover
  body: ColumnBlock[]
  sources: ColumnSource[]
}
