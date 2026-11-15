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
    // Only real recommendations use up the daily quota (see sommelierQuota).
    res.locals.countsTowardQuota = result.status === 'ok'
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}
