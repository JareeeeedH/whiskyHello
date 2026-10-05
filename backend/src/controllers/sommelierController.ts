import { NextFunction, Request, Response } from 'express'
import * as sommelierService from '../services/sommelierService'
import type { PreferenceRequestBody } from '../validations/sommelierValidation'

export async function createPreference(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const preference = await sommelierService.buildPreference(
      req.body as PreferenceRequestBody,
    )
    res.status(200).json({ preference })
  } catch (error) {
    next(error)
  }
}
