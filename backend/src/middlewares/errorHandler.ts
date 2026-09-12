import { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import { env } from '../config/env'
import { AppError } from '../utils/AppError'

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Not found' })
}

function isMongooseCastError(err: unknown): err is mongoose.Error.CastError {
  return err instanceof mongoose.Error.CastError
}

function isMongooseValidationError(
  err: unknown,
): err is mongoose.Error.ValidationError {
  return err instanceof mongoose.Error.ValidationError
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    })
    return
  }

  if (isMongooseCastError(err)) {
    res.status(400).json({
      message: 'Invalid id',
      details: [`Invalid ${err.path || 'value'}`],
    })
    return
  }

  if (isMongooseValidationError(err)) {
    const details = Object.values(err.errors).map((item) => item.message)
    res.status(400).json({
      message: 'Validation failed',
      ...(details.length > 0 ? { details } : {}),
    })
    return
  }

  console.error(err)

  const message =
    !env.isProduction && err instanceof Error
      ? err.message
      : 'Internal server error'

  res.status(500).json({ message })
}
