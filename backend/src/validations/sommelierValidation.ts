import Joi from 'joi'
import {
  OCCASIONS,
  PREFERENCE_SCALE_MAX,
  PREFERENCE_SCALE_MIN,
  STYLE_KEYS,
  TASTE_KEYS,
  TASTE_PICKS_MAX,
  TASTE_PICKS_MIN,
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

/**
 * Taste holds only the picked tastes, 3–5 of them, each rated. Unknown keys
 * (including the retired driedFruit, citrus and vanillaCaramel) are rejected
 * rather than stripped, so a stale client can't slip through with fewer picks.
 */
const tasteSchema = Joi.object(
  Object.fromEntries(TASTE_KEYS.map((key) => [key, ratingValue(`Taste ${key}`)])),
)
  .required()
  .min(TASTE_PICKS_MIN)
  .max(TASTE_PICKS_MAX)
  .prefs({ stripUnknown: false })
  .messages({
    'object.base': 'Taste must be an object',
    'any.required': 'Taste is required',
    'object.min': `Taste must rate ${TASTE_PICKS_MIN}–${TASTE_PICKS_MAX} flavors`,
    'object.max': `Taste must rate ${TASTE_PICKS_MIN}–${TASTE_PICKS_MAX} flavors`,
    'object.unknown': 'Taste {#key} is not a supported flavor',
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
  occasion: Joi.string()
    .valid(...OCCASIONS)
    .messages({
      'string.base': 'Occasion must be a string',
      'string.empty': 'Occasion is not supported',
      'any.only': 'Occasion is not supported',
    }),
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
