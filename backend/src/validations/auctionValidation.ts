import Joi from 'joi'

const whiskyId = Joi.string().trim().min(1).required().messages({
  'string.empty': 'Whisky id is required',
  'any.required': 'Whisky id is required',
})

const title = Joi.string().trim().min(1).required().messages({
  'string.empty': 'Title is required',
  'any.required': 'Title is required',
})

const description = Joi.string().trim().allow('')

const startingPrice = Joi.number().min(0).required().messages({
  'number.base': 'Starting price must be a number',
  'number.min': 'Starting price must be at least 0',
  'any.required': 'Starting price is required',
})

const startAt = Joi.date().iso().required().messages({
  'date.base': 'Start time must be a valid date',
  'date.format': 'Start time must be a valid date',
  'any.required': 'Start time is required',
})

export const END_AT_AFTER_START_AT_MESSAGE = 'End time must be after start time'

const endAt = Joi.date().iso().greater(Joi.ref('startAt')).required().messages({
  'date.base': 'End time must be a valid date',
  'date.format': 'End time must be a valid date',
  'date.greater': END_AT_AFTER_START_AT_MESSAGE,
  'any.required': 'End time is required',
})

export const createAuctionSchema = Joi.object({
  whiskyId,
  title,
  description,
  startingPrice,
  startAt,
  endAt,
})

export const updateAuctionSchema = Joi.object({
  whiskyId: Joi.string().trim().min(1).messages({
    'string.empty': 'Whisky id is required',
  }),
  title: Joi.string().trim().min(1).messages({
    'string.empty': 'Title is required',
  }),
  description,
  startingPrice: Joi.number().min(0).messages({
    'number.base': 'Starting price must be a number',
    'number.min': 'Starting price must be at least 0',
  }),
  startAt: Joi.date().iso().messages({
    'date.base': 'Start time must be a valid date',
    'date.format': 'Start time must be a valid date',
  }),
  endAt: Joi.date()
    .iso()
    .when('startAt', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('startAt')),
    })
    .messages({
      'date.base': 'End time must be a valid date',
      'date.format': 'End time must be a valid date',
      'date.greater': END_AT_AFTER_START_AT_MESSAGE,
    }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field is required to update',
  })

export const cancelAuctionSchema = Joi.object({
  message: Joi.string().trim().min(1).max(500).required().messages({
    'string.base': 'Status change message is required',
    'string.empty': 'Status change message is required',
    'string.max': 'Status change message must be at most 500 characters',
    'any.required': 'Status change message is required',
  }),
})

export const auctionIdParamsSchema = Joi.object({
  id: Joi.string().trim().hex().length(24).required().messages({
    'string.hex': 'Auction id must be a valid id',
    'string.length': 'Auction id must be a valid id',
    'any.required': 'Auction id is required',
  }),
})

export type CreateAuctionBody = {
  whiskyId: string
  title: string
  description?: string
  startingPrice: number
  startAt: Date
  endAt: Date
}

export type UpdateAuctionBody = {
  whiskyId?: string
  title?: string
  description?: string
  startingPrice?: number
  startAt?: Date
  endAt?: Date
}

export type CancelAuctionBody = {
  message: string
}
