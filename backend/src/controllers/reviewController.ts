import { NextFunction, Request, Response } from 'express'
import * as reviewService from '../services/reviewService'
import type {
  CreateReviewBody,
  UpdateReviewBody,
} from '../validations/reviewValidation'

export async function listByWhisky(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const whiskyId = String(req.params.whiskyId)
    const reviews = await reviewService.listReviewsByWhiskyId(whiskyId)
    res.status(200).json({ reviews })
  } catch (error) {
    next(error)
  }
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const body = req.body as CreateReviewBody
    const review = await reviewService.createReview(req.user.userId, body)
    res.status(201).json({ review })
  } catch (error) {
    next(error)
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const body = req.body as UpdateReviewBody
    const review = await reviewService.updateReview(
      String(req.params.id),
      req.user.userId,
      body,
    )
    res.status(200).json({ review })
  } catch (error) {
    next(error)
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    await reviewService.deleteReview(String(req.params.id), req.user.userId)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function listMine(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const reviews = await reviewService.listMyReviews(req.user.userId)
    res.status(200).json({ reviews })
  } catch (error) {
    next(error)
  }
}
