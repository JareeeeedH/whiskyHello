import Joi from 'joi'

const optionalText = Joi.string().trim().allow('').max(1000)

export const createReviewSchema = Joi.object({
  whiskyId: Joi.string().trim().min(1).max(64).required().messages({
    'string.empty': 'Whisky id is required',
    'any.required': 'Whisky id is required',
  }),
  title: Joi.string().trim().min(1).max(120).required().messages({
    'string.empty': 'Title is required',
    'any.required': 'Title is required',
  }),
  content: Joi.string().trim().min(1).max(5000).required().messages({
    'string.empty': 'Content is required',
    'any.required': 'Content is required',
  }),
  rating: Joi.number().integer().min(0).max(100).required().messages({
    'number.base': 'Rating must be a number',
    'number.min': 'Rating must be at least 0',
    'number.max': 'Rating must be at most 100',
    'any.required': 'Rating is required',
  }),
  nose: optionalText,
  taste: optionalText,
  finish: optionalText,
})

export const updateReviewSchema = Joi.object({
  title: Joi.string().trim().min(1).max(120),
  content: Joi.string().trim().min(1).max(5000),
  rating: Joi.number().integer().min(0).max(100).messages({
    'number.base': 'Rating must be a number',
    'number.min': 'Rating must be at least 0',
    'number.max': 'Rating must be at most 100',
  }),
  nose: optionalText,
  taste: optionalText,
  finish: optionalText,
})
  .min(1)
  .messages({
    'object.min': 'At least one field is required to update',
  })

export const whiskyIdParamsSchema = Joi.object({
  whiskyId: Joi.string().trim().min(1).max(64).required(),
})

export const reviewIdParamsSchema = Joi.object({
  id: Joi.string().trim().hex().length(24).required().messages({
    'string.hex': 'Review id must be a valid id',
    'string.length': 'Review id must be a valid id',
    'any.required': 'Review id is required',
  }),
})

export type CreateReviewBody = {
  whiskyId: string
  title: string
  content: string
  rating: number
  nose?: string
  taste?: string
  finish?: string
}

export type UpdateReviewBody = {
  title?: string
  content?: string
  rating?: number
  nose?: string
  taste?: string
  finish?: string
}
