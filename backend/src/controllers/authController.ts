import { NextFunction, Request, Response } from 'express'
import * as authService from '../services/authService'
import type { RegisterBody } from '../validations/authValidation'

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as RegisterBody
    const user = await authService.registerUser(body)
    res.status(201).json({ user })
  } catch (error) {
    next(error)
  }
}
