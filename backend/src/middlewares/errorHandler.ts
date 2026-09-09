import { NextFunction, Request, Response } from 'express'

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Not found' })
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(err)

  const message =
    err instanceof Error ? err.message : 'Internal server error'

  res.status(500).json({ message })
}
