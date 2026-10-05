import type {
  PreferenceOccasion,
  SommelierCompanion,
  SommelierMood,
  TasteLevel,
} from '../types/sommelier'
import { OCCASION_LABELS } from './sommelierInput'

export const TASTE_LEVEL_LABELS: Record<TasteLevel, string> = {
  low: '輕微',
  medium: '適中',
  high: '強烈',
}

export const TASTE_LEVEL_STEPS: Record<TasteLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
}

export const PREFERENCE_OCCASION_LABELS: Record<PreferenceOccasion, string> = {
  ...OCCASION_LABELS,
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
