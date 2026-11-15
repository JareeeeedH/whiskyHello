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

/** Largest page the admin query-log list returns. */
export const SOMMELIER_LOG_PAGE_MAX = 100

/** Query string for GET /api/v1/admin/sommelier-logs. */
export const sommelierLogListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().integer().min(1).max(SOMMELIER_LOG_PAGE_MAX).default(20).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': `Limit must be at most ${SOMMELIER_LOG_PAGE_MAX}`,
  }),
})

export interface SommelierLogListQuery {
  page: number
  limit: number
}
