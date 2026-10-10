import { NextFunction, Request, Response } from 'express'
import * as sommelierService from '../services/sommelierService'
import type { RecommendationRequestBody } from '../validations/sommelierValidation'

export async function createRecommendations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await sommelierService.recommendWhiskies(
      req.body as RecommendationRequestBody,
    )
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}
