import type {
  PreferenceOccasion,
  SommelierCompanion,
  SommelierMood,
} from '../types/sommelier.ts'

export const PREFERENCE_OCCASION_LABELS: Record<PreferenceOccasion, string> = {
  relaxing: '放鬆獨飲',
  tasting: '專心品飲',
  social: '朋友聚會',
  meal: '搭配餐點',
  date: '伴侶約會',
  gift: '送禮',
  celebration: '慶祝時刻',
}

export const MOOD_LABELS: Record<SommelierMood, string> = {
  positive: '心情好、想慶祝',
  neutral: '平常、沒有特別情緒',
  low: '低落、疲憊',
  stressed: '壓力大、焦慮',
}

export const COMPANION_LABELS: Record<SommelierCompanion, string> = {
  alone: '一個人',
  friend: '朋友',
  date: '約會對象',
  partner: '伴侶',
  family: '家人',
}
