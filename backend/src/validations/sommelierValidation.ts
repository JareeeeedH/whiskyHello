import Joi from 'joi'
import { FLAVOR_TAGS, INTENSITY_MAX, INTENSITY_MIN, STEP1_OCCASIONS } from '../types/sommelier'
import type { SommelierInput } from '../types/sommelier'

/** Upper bound on text forwarded to the LLM. */
export const FREE_TEXT_MAX_LENGTH = 1000

function flavorTagList(label: string) {
  return Joi.array()
    .items(
      Joi.string()
        .valid(...FLAVOR_TAGS)
        .messages({
          'string.base': `${label} contains an unsupported flavor tag`,
          'any.only': `${label} contains an unsupported flavor tag`,
        }),
    )
    .unique()
    .messages({
      'array.base': `${label} must be an array`,
      'array.unique': `${label} must not contain duplicate tags`,
      'any.required': `${label} is required`,
    })
}

const budgetValue = (label: string) =>
  Joi.number()
    .min(0)
    .messages({
      'number.base': `Budget ${label} must be a number`,
      'number.min': `Budget ${label} must be at least 0`,
      'number.infinity': `Budget ${label} must be a number`,
    })

const intensityValue = (label: string) =>
  Joi.number()
    .integer()
    .min(INTENSITY_MIN)
    .max(INTENSITY_MAX)
    .messages({
      'number.base': `Intensity ${label} must be a number`,
      'number.integer': `Intensity ${label} must be an integer`,
      'number.min': `Intensity ${label} must be at least ${INTENSITY_MIN}`,
      'number.max': `Intensity ${label} must be at most ${INTENSITY_MAX}`,
      'number.infinity': `Intensity ${label} must be a number`,
    })

export const preferenceRequestSchema = Joi.object({
  taste: flavorTagList('Taste').required(),
  dislikes: flavorTagList('Dislikes').default([]),
  intensity: Joi.object({
    peaty: intensityValue('peaty'),
    smoky: intensityValue('smoky'),
  }).messages({
    'object.base': 'Intensity must be an object',
  }),
  budget: Joi.object({
    min: budgetValue('min'),
    max: budgetValue('max'),
  }).messages({
    'object.base': 'Budget must be an object',
  }),
  occasion: Joi.string()
    .valid(...STEP1_OCCASIONS)
    .messages({
      'string.base': 'Occasion is not supported',
      'any.only': 'Occasion is not supported',
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
