/**
 * Homepage mock reviews for UI preview only.
 * Will be replaced by Review API later.
 * whiskyId values map to real Static Whisky ids.
 */
export interface MockFriendReview {
  id: string
  userName: string
  rating: number
  title: string
  content: string
  createdAt: string
  whiskyId: string
  whiskyName: string
}

export const mockFriendReviews: MockFriendReview[] = [
  {
    id: 'mock-review-1',
    userName: 'Jared',
    rating: 90,
    title: '煙燻與海鹽很漂亮',
    content: '入口帶著明顯海鹽與煙燻感，尾韻很長，整體平衡很好。',
    createdAt: '2 小時前',
    whiskyId: '1385',
    whiskyName: 'Talisker 10 yo',
  },
  {
    id: 'mock-review-2',
    userName: 'WhiskyFan',
    rating: 87,
    title: '很舒服的一杯',
    content: '柑橘、淡淡木質與煙燻交織，喝起來很順。',
    createdAt: '5 小時前',
    whiskyId: '5160',
    whiskyName: 'Macallan 10 yo',
  },
  {
    id: 'mock-review-3',
    userName: 'Ken',
    rating: 92,
    title: '香氣非常有層次',
    content: '前段是水果與蜂蜜，之後慢慢出現香料與木質調。',
    createdAt: '昨天',
    whiskyId: '9228',
    whiskyName: 'Mortlach 1936',
  },
  {
    id: 'mock-review-4',
    userName: 'Mia',
    rating: 84,
    title: '適合慢慢喝',
    content: '入口柔和，後段帶一點辛香，很適合慢慢品飲。',
    createdAt: '昨天',
    whiskyId: '7848',
    whiskyName: 'Ben Nevis 19 yo 1997/2016',
  },
  {
    id: 'mock-review-5',
    userName: 'Allen',
    rating: 89,
    title: '雪莉桶表現不錯',
    content: '乾果、巧克力與木質感很明顯，尾韻乾淨。',
    createdAt: '2 天前',
    whiskyId: '4729',
    whiskyName: 'Longmorn 10 yo',
  },
  {
    id: 'mock-review-6',
    userName: '小威',
    rating: 86,
    title: '意外地很有特色',
    content: '第一口很有個性，放一下之後香氣變得更加完整。',
    createdAt: '3 天前',
    whiskyId: '50',
    whiskyName: 'Caol Ila 11 yo 2010/2021',
  },
]
