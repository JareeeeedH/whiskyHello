import { NextFunction, Request, Response } from 'express'
import { env } from '../config/env'

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return true
  }

  return env.corsOrigins.includes(origin)
}

export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const origin = req.headers.origin

  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  )
  res.setHeader(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] ??
      'Content-Type, Authorization',
  )

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  next()
}
