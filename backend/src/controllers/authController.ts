import { NextFunction, Request, Response } from 'express'
import * as authService from '../services/authService'
import type {
  GoogleLoginBody,
  LoginBody,
  RegisterBody,
  ResendRegistrationCodeBody,
  VerifyRegistrationBody,
} from '../validations/authValidation'

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as RegisterBody
    const result = await authService.registerUser(body)
    res.status(202).json({ message: 'Verification code sent', email: result.email })
  } catch (error) {
    next(error)
  }
}

export async function verifyRegistration(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as VerifyRegistrationBody
    const result = await authService.verifyRegistration(body)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function resendRegistrationCode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as ResendRegistrationCodeBody
    await authService.resendRegistrationCode(body)
    res.status(200).json({
      message: 'If this email has a pending registration, a new code has been sent',
    })
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

export async function googleLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as GoogleLoginBody
    const result = await authService.loginWithGoogle(body)
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
