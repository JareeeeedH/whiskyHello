import Joi from 'joi'
import {
  PREFERENCE_SCALE_MAX,
  PREFERENCE_SCALE_MIN,
  STYLE_KEYS,
  TASTE_GROUPS,
  TASTE_KEYS,
  TASTE_PICKS_PER_GROUP,
} from '../types/sommelier'
import type { SommelierInput } from '../types/sommelier'

/** Upper bound on text forwarded to the LLM. */
export const FREE_TEXT_MAX_LENGTH = 1000

const ratingValue = (label: string) =>
  Joi.number()
    .strict()
    .integer()
    .min(PREFERENCE_SCALE_MIN)
    .max(PREFERENCE_SCALE_MAX)
    .messages({
      'number.base': `${label} must be a number`,
      'number.integer': `${label} must be an integer`,
      'number.min': `${label} must be at least ${PREFERENCE_SCALE_MIN}`,
      'number.max': `${label} must be at most ${PREFERENCE_SCALE_MAX}`,
      'number.infinity': `${label} must be a number`,
      'any.required': `${label} is required`,
    })

/** Taste holds only the picked tastes: exactly 3 from each group of six. */
const tasteSchema = Joi.object(
  Object.fromEntries(TASTE_KEYS.map((key) => [key, ratingValue(`Taste ${key}`)])),
)
  .required()
  .custom((taste: Record<string, unknown>, helpers) => {
    const picksPerGroup = TASTE_GROUPS.map(
      (group) => group.filter((key) => taste[key] !== undefined).length,
    )
    return picksPerGroup.every((count) => count === TASTE_PICKS_PER_GROUP)
      ? taste
      : helpers.error('taste.picks')
  })
  .messages({
    'object.base': 'Taste must be an object',
    'any.required': 'Taste is required',
    'taste.picks': `Taste must rate exactly ${TASTE_PICKS_PER_GROUP} flavors from each group`,
  })

const styleSchema = Joi.object(
  Object.fromEntries(STYLE_KEYS.map((key) => [key, ratingValue(`Style ${key}`).required()])),
)
  .required()
  .messages({
    'object.base': 'Style must be an object',
    'any.required': 'Style is required',
  })

const budgetValue = (label: string) =>
  Joi.number()
    .min(0)
    .messages({
      'number.base': `Budget ${label} must be a number`,
      'number.min': `Budget ${label} must be at least 0`,
      'number.infinity': `Budget ${label} must be a number`,
    })

export const preferenceRequestSchema = Joi.object({
  taste: tasteSchema,
  style: styleSchema,
  budget: Joi.object({
    min: budgetValue('min'),
    max: budgetValue('max'),
  }).messages({
    'object.base': 'Budget must be an object',
  }),
  freeText: Joi.string()
    .trim()
    .allow('')
    .max(FREE_TEXT_MAX_LENGTH)
    .messages({
      'string.base': 'Free text must be a string',
      'string.max': `Free text must be at most ${FREE_TEXT_MAX_LENGTH} characters`,
    }),
})

export type PreferenceRequestBody = SommelierInput
