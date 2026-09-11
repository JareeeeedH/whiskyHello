import { NextFunction, Request, Response } from 'express'
import { env } from '../config/env'
import { AppError } from '../utils/AppError'

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Not found' })
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

  console.error(err)

  const message =
    !env.isProduction && err instanceof Error
      ? err.message
      : 'Internal server error'

  res.status(500).json({ message })
}
