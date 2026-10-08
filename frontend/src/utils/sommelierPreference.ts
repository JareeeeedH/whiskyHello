import type {
  PreferenceOccasion,
  SommelierCompanion,
  SommelierMood,
} from '../types/sommelier.ts'

export const PREFERENCE_OCCASION_LABELS: Record<PreferenceOccasion, string> = {
  relaxing: '放鬆、獨飲',
  social: '聚會、朋友小酌',
  meal: '搭配餐點',
  gift: '送禮',
  beginner: '入門、第一次嘗試',
  premium: '特別場合、想喝好一點',
  date: '約會',
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
