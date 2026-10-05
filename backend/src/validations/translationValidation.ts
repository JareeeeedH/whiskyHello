import Joi from 'joi'
import { TRANSLATION_LANGUAGES, TRANSLATION_SOURCE_MAX_LENGTH } from '../types/translation'

export const whiskyTranslationRequestSchema = Joi.object({
  whiskyId: Joi.string().trim().min(1).max(64).required().messages({
    'string.empty': 'Whisky id is required',
    'any.required': 'Whisky id is required',
  }),
  language: Joi.string()
    .valid(...TRANSLATION_LANGUAGES)
    .required()
    .messages({
      'any.only': `Language must be one of: ${TRANSLATION_LANGUAGES.join(', ')}`,
      'any.required': 'Language is required',
    }),
  text: Joi.string().trim().min(1).max(TRANSLATION_SOURCE_MAX_LENGTH).required().messages({
    'string.empty': 'Text is required',
    'string.max': `Text must be at most ${TRANSLATION_SOURCE_MAX_LENGTH} characters`,
    'any.required': 'Text is required',
  }),
})
