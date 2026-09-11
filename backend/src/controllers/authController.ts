import { NextFunction, Request, Response } from 'express'
import * as authService from '../services/authService'
import type { LoginBody, RegisterBody } from '../validations/authValidation'

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

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as LoginBody
    const result = await authService.loginUser(body)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const user = await authService.getCurrentUser(req.user.userId)
    res.status(200).json({ user })
  } catch (error) {
    next(error)
  }
}
