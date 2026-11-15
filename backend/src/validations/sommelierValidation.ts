import Joi from 'joi'
import { MESSAGE_MAX_LENGTH } from '../types/sommelier'
import type { SommelierInput } from '../types/sommelier'

export const recommendationRequestSchema = Joi.object({
  message: Joi.string()
    .trim()
    .min(1)
    .max(MESSAGE_MAX_LENGTH)
    .required()
    .messages({
      'string.base': 'Message must be a string',
      'string.empty': 'Message is required',
      'string.min': 'Message is required',
      'string.max': `Message must be at most ${MESSAGE_MAX_LENGTH} characters`,
      'any.required': 'Message is required',
    }),
})

export type RecommendationRequestBody = SommelierInput
