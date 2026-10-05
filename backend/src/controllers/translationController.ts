import { NextFunction, Request, Response } from 'express'
import * as translationService from '../services/translationService'
import type { WhiskyTranslationRequest } from '../types/translation'

export async function createWhiskyTranslation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const translation = await translationService.getWhiskyNoteTranslation(
      req.body as WhiskyTranslationRequest,
    )
    res.status(200).json({ translation })
  } catch (error) {
    next(error)
  }
}
