import { NextFunction, Request, Response } from 'express'
import * as bidService from '../services/bidService'
import type { CreateBidBody } from '../validations/bidValidation'

export async function listByAuction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await bidService.listBidsForAuction(String(req.params.id))
    res.status(200).json(result)
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

    const result = await bidService.createBid(
      String(req.params.id),
      req.user.userId,
      req.body as CreateBidBody,
    )
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}
