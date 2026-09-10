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
    title: '第一口就想起海邊',
    content:
      '第一次喝的時候其實有點被煙燻味嚇到，但多喝兩口之後，海鹽、胡椒跟一點柑橘慢慢跑出來。那天剛好是下班後一個人坐在陽台喝，莫名覺得很適合。',
    createdAt: '2 小時前',
    whiskyId: '1385',
    whiskyName: 'Talisker 10 yo',
  },
  {
    id: 'mock-review-2',
    userName: 'Mia',
    rating: 87,
    title: '週末很適合的一杯',
    content:
      '不是第一口就很衝擊的類型，但慢慢喝越來越順。蘋果、香草和一點木頭味都有，整體很舒服。',
    createdAt: '4 小時前',
    whiskyId: '5160',
    whiskyName: 'Macallan 10 yo',
  },
  {
    id: 'mock-review-3',
    userName: 'Ken',
    rating: 92,
    title: '越喝越有意思',
    content:
      '第一次喝只覺得不錯，第二次再開反而覺得更喜歡。水果甜感後面慢慢跑出香料跟木質，層次很漂亮。現在有點後悔當初沒有多留一瓶。',
    createdAt: '6 小時前',
    whiskyId: '9228',
    whiskyName: 'Mortlach 1936',
  },
  {
    id: 'mock-review-4',
    userName: 'Allen',
    rating: 84,
    title: '今晚只是想安靜喝一杯',
    content:
      '今天工作有點煩，回家倒了一杯慢慢喝。沒有非常強烈，但很耐喝，最後覺得心情好很多。',
    createdAt: '8 小時前',
    whiskyId: '7848',
    whiskyName: 'Ben Nevis 19 yo 1997/2016',
  },
  {
    id: 'mock-review-5',
    userName: '小威',
    rating: 89,
    title: '朋友喝完直接問是哪一瓶',
    content:
      '原本只是隨手開來喝，結果朋友問我這支是哪裡買的。乾果跟巧克力感滿明顯，尾韻也漂亮。',
    createdAt: '10 小時前',
    whiskyId: '4729',
    whiskyName: 'Longmorn 10 yo',
  },
  {
    id: 'mock-review-6',
    userName: 'WhiskyFan',
    rating: 86,
    title: '慢慢喝才懂',
    content:
      '第一口普通，放了一下之後反而變得很有趣。這種酒我通常會喝得比預期久。',
    createdAt: '昨天',
    whiskyId: '50',
    whiskyName: 'Caol Ila 11 yo 2010/2021',
  },
  {
    id: 'mock-review-7',
    userName: 'Ray',
    rating: 88,
    title: '這瓶有點超出期待',
    content:
      '本來沒有抱太大期待，結果香氣比想像中豐富。帶一點水果跟木質，最後還有淡淡的煙燻。',
    createdAt: '昨天',
    whiskyId: '4349',
    whiskyName: 'Wolfburn 2014/2018',
  },
  {
    id: 'mock-review-8',
    userName: 'Amy',
    rating: 91,
    title: '很喜歡它的厚度',
    content:
      '入口比想像中飽滿，甜味跟煙燻沒有互相打架，反而很平衡。尾韻留得滿久。',
    createdAt: '昨天',
    whiskyId: '878',
    whiskyName: 'Ledaig 18 yo',
  },
  {
    id: 'mock-review-9',
    userName: 'Derek',
    rating: 83,
    title: '朋友說普通，我反而滿喜歡',
    content:
      '不是那種很討好人的酒，喝第一口甚至覺得有點怪，但後來越喝越順。可能就是比較合我的口味。',
    createdAt: '昨天',
    whiskyId: '7337',
    whiskyName: 'Mannochmore 20 yo 1997/2017',
  },
  {
    id: 'mock-review-10',
    userName: '小陳',
    rating: 90,
    title: '很適合跟老朋友一起喝',
    content:
      '這瓶是在幾個老朋友聚會的時候開的，本來只打算一人一杯，最後整瓶直接喝完。酒本身不用多介紹，氣氛對了就很漂亮。',
    createdAt: '2 天前',
    whiskyId: '500',
    whiskyName: "Diamond 2012/2020 'VSG'",
  },
  {
    id: 'mock-review-11',
    userName: 'David',
    rating: 85,
    title: '有點意外的香甜',
    content:
      '本來以為會比較重，結果入口意外地舒服。喝到後面才慢慢出現比較明顯的木質。',
    createdAt: '2 天前',
    whiskyId: '7048',
    whiskyName: 'Inchgower 35 yo 1966/2001',
  },
  {
    id: 'mock-review-12',
    userName: 'Nina',
    rating: 93,
    title: '這瓶真的讓我停下來了',
    content:
      '香氣一開始就很完整，入口之後又有另一層變化。不是天天會喝的類型，但碰到的話很願意再開。',
    createdAt: '2 天前',
    whiskyId: '1902',
    whiskyName: 'Mortlach 21 yo',
  },
  {
    id: 'mock-review-13',
    userName: 'Tom',
    rating: 81,
    title: '沒有想像中重口味',
    content:
      '原本看到風格有點擔心會太強，結果其實還滿好喝的。沒有特別驚艷，但也不會失望。',
    createdAt: '3 天前',
    whiskyId: '12156',
    whiskyName: 'Linkwood 10 yo 2010/2020',
  },
  {
    id: 'mock-review-14',
    userName: 'Wei',
    rating: 88,
    title: '晚上看電影配這個剛好',
    content:
      '今天沒有認真寫 tasting note，就是開了一杯配電影。甜、木質、微微煙燻，意外很搭。',
    createdAt: '3 天前',
    whiskyId: '6960',
    whiskyName: 'Glenmorangie 10 yo',
  },
  {
    id: 'mock-review-15',
    userName: 'Sarah',
    rating: 79,
    title: '這支不是我的菜',
    content:
      '味道其實沒有不好，只是對我來說太乾、太直。朋友倒是很喜歡，所以還是覺得值得試一次。',
    createdAt: '3 天前',
    whiskyId: '3136',
    whiskyName: 'Bruichladdich 17 yo 1990/2007',
  },
  {
    id: 'mock-review-16',
    userName: 'Leo',
    rating: 94,
    title: '今天喝到目前最喜歡的一杯',
    content:
      '今天本來只想找一支比較熟悉的喝，結果最後這杯完全搶走注意力。香氣、入口、尾韻都很漂亮，喝完還一直想回味。',
    createdAt: '4 天前',
    whiskyId: '714',
    whiskyName: "Macallan 1851 'Inspiration'",
  },
  {
    id: 'mock-review-17',
    userName: '小豪',
    rating: 82,
    title: '第一次喝這個風格',
    content:
      '以前比較常喝雪莉桶，這次換個方向。第一口不太習慣，但喝到後面開始覺得有趣。',
    createdAt: '4 天前',
    whiskyId: '6271',
    whiskyName: 'D.Y.C. 10 yo',
  },
  {
    id: 'mock-review-18',
    userName: 'Mark',
    rating: 89,
    title: '放十分鐘真的有差',
    content:
      '剛倒出來覺得有點普通，放著聊了一下再回來喝，香氣整個開了。這種變化我很喜歡。',
    createdAt: '5 天前',
    whiskyId: '11907',
    whiskyName: "Kilkerran 'Work in Progress 7 - Bourbon Wood'",
  },
  {
    id: 'mock-review-19',
    userName: 'Yuki',
    rating: 86,
    title: '會讓人想慢慢喝完',
    content:
      '沒有什麼很誇張的味道，但是從第一口到最後一口都很順。這種酒反而容易一杯接一杯。',
    createdAt: '5 天前',
    whiskyId: '6933',
    whiskyName: 'Caroni 23 yo 1994/2017',
  },
  {
    id: 'mock-review-20',
    userName: 'Andy',
    rating: 91,
    title: '如果還有一瓶，我會先藏起來',
    content:
      '很喜歡它的整體平衡，甜味、木質和一點點辛香都在。朋友喝完一直問還有沒有，答案是沒有了。',
    createdAt: '6 天前',
    whiskyId: '10599',
    whiskyName: "Alipur's 'San Baltazar' 47.4% 2008",
  },
]
