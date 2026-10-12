/** Chinese names used in Taiwan for distilleries and brands that whisky names start with. */
const DISTILLERY_NAMES_ZH: Record<string, string> = {
  // Islay
  Ardbeg: '雅柏',
  Laphroaig: '拉弗格',
  Lagavulin: '樂加維林',
  Bowmore: '波摩',
  'Caol Ila': '卡爾里拉',
  Bunnahabhain: '布納哈本',
  Bruichladdich: '布萊迪',
  'Port Charlotte': '波夏',
  Octomore: '奧特摩',
  Kilchoman: '齊侯門',
  'Port Ellen': '波特艾倫',
  // Speyside
  Macallan: '麥卡倫',
  Glenfiddich: '格蘭菲迪',
  Glenlivet: '格蘭利威',
  Balvenie: '百富',
  Glenfarclas: '格蘭花格',
  Aberlour: '亞伯樂',
  Mortlach: '慕赫',
  Glenallachie: '艾樂奇',
  Benriach: '班瑞克',
  Craigellachie: '魁列奇',
  'Glen Grant': '格蘭冠',
  Glenrothes: '格蘭路思',
  Longmorn: '朗摩',
  Linkwood: '林可伍德',
  Cragganmore: '克拉格摩爾',
  Strathisla: '史翠艾拉',
  Benromach: '本諾曼克',
  'Glen Moray': '格蘭莫雷',
  Cardhu: '卡杜',
  Tamdhu: '檀都',
  // Highlands
  Glenmorangie: '格蘭傑',
  Dalmore: '大摩',
  Glendronach: '格蘭多納',
  Clynelish: '克里尼利基',
  'Old Pulteney': '富特尼',
  Oban: '歐本',
  Dalwhinnie: '達爾維尼',
  Aberfeldy: '艾柏迪',
  Tomatin: '湯瑪丁',
  Deanston: '汀斯頓',
  'Ben Nevis': '班尼富',
  Glengoyne: '格蘭哥尼',
  Edradour: '艾德多爾',
  'Glen Garioch': '格蘭蓋瑞',
  Fettercairn: '費特肯',
  Glenturret: '格蘭塔瑞',
  'Loch Lomond': '羅曼湖',
  Brora: '布朗拉',
  // Islands
  'Highland Park': '高原騎士',
  Talisker: '泰斯卡',
  Arran: '艾倫',
  Jura: '吉拉',
  'Isle of Jura': '吉拉',
  Tobermory: '托本莫瑞',
  Ledaig: '雷德克',
  // Campbeltown
  Springbank: '雲頂',
  Longrow: '朗格羅',
  Hazelburn: '赫佐本',
  'Glen Scotia': '格蘭帝',
  Kilkerran: '齊克倫',
  // Lowlands
  Auchentoshan: '歐肯特軒',
  Glenkinchie: '格蘭昆奇',
  Littlemill: '利特米爾',
  // Japan and Taiwan
  Yamazaki: '山崎',
  Hakushu: '白州',
  Hibiki: '響',
  Yoichi: '余市',
  Miyagikyo: '宮城峽',
  Chichibu: '秩父',
  Nikka: '日果',
  Kavalan: '噶瑪蘭',
  // Blends
  'Johnnie Walker': '約翰走路',
  'Chivas Regal': '起瓦士',
  'Monkey Shoulder': '三隻猴子',
}

/** Longest first, so "Isle of Jura" wins over "Jura". */
const DISTILLERY_PATTERNS = Object.entries(DISTILLERY_NAMES_ZH)
  .sort(([a], [b]) => b.length - a.length)
  .map(([english, chinese]) => ({
    pattern: new RegExp(`^${english.replace(/ /g, '\\s+')}(?![a-z])`, 'i'),
    chinese,
  }))

/** Chinese distillery name for a whisky name such as "Ardbeg 10 yo"; undefined when not listed. */
export function chineseDistilleryName(whiskyName: string): string | undefined {
  const name = whiskyName.trim()
  return DISTILLERY_PATTERNS.find(({ pattern }) => pattern.test(name))?.chinese
}
