/** Public review shape returned from APIs. */
export interface PublicReview {
  id: string
  userId: string
  whiskyId: string
  title: string
  content: string
  rating: number
  nose: string
  taste: string
  finish: string
  createdAt: Date
  updatedAt: Date
  authorName?: string
}
