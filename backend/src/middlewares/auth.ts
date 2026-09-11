import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import type { AuthPayload } from '../types/auth'

function isAuthPayload(value: unknown): value is AuthPayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  return typeof (value as AuthPayload).userId === 'string'
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid authorization header' })
    return
  }

  const token = header.slice('Bearer '.length).trim()

  if (!token) {
    res.status(401).json({ message: 'Missing token' })
    return
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret)

    if (!isAuthPayload(decoded)) {
      res.status(401).json({ message: 'Invalid token' })
      return
    }

    req.user = { userId: decoded.userId }
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Token expired' })
      return
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid token' })
      return
    }

    res.status(401).json({ message: 'Invalid or expired token' })
  }
}
