import Joi from 'joi'

export const createBidSchema = Joi.object({
  amount: Joi.number().integer().min(0).required().messages({
    'number.base': 'Amount must be a number',
    'number.integer': 'Amount must be an integer',
    'number.min': 'Amount must be at least 0',
    'any.required': 'Amount is required',
  }),
})

export type CreateBidBody = {
  amount: number
}
