import Joi from 'joi'

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required',
  }),
  email: Joi.string().trim().lowercase().email().max(254).required().messages({
    'string.email': 'Email must be a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password must be at most 128 characters',
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  }),
})

export const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(254).required().messages({
    'string.email': 'Email must be a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(1).max(128).required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  }),
})

const emailField = Joi.string().trim().lowercase().email().max(254).required().messages({
  'string.email': 'Email must be a valid email address',
  'string.empty': 'Email is required',
  'any.required': 'Email is required',
})

const codeField = Joi.string()
  .trim()
  .pattern(/^\d{6}$/)
  .required()
  .messages({
    'string.pattern.base': 'Verification code must be 6 digits',
    'string.empty': 'Verification code is required',
    'any.required': 'Verification code is required',
  })

export const verifyRegistrationSchema = Joi.object({
  email: emailField,
  code: codeField,
})

export const resendRegistrationCodeSchema = Joi.object({
  email: emailField,
})

export const forgotPasswordSchema = Joi.object({
  email: emailField,
})

export const resetPasswordSchema = Joi.object({
  email: emailField,
  code: codeField,
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password must be at most 128 characters',
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  }),
})

export const googleLoginSchema = Joi.object({
  credential: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Google credential is required',
    'any.required': 'Google credential is required',
  }),
})

export type RegisterBody = {
  name: string
  email: string
  password: string
}

export type LoginBody = {
  email: string
  password: string
}

export type VerifyRegistrationBody = {
  email: string
  code: string
}

export type ResendRegistrationCodeBody = {
  email: string
}

export type ForgotPasswordBody = {
  email: string
}

export type ResetPasswordBody = {
  email: string
  code: string
  password: string
}

export type GoogleLoginBody = {
  credential: string
}
