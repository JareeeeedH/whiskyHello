import { NextFunction, Request, Response } from 'express'
import * as adminService from '../services/adminService'
import * as sommelierLogService from '../services/sommelierLogService'
import type { SommelierLogListQuery } from '../validations/sommelierValidation'

export async function listUsers(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const users = await adminService.listUsersForAdmin()
    res.status(200).json({ users })
  } catch (error) {
    next(error)
  }
}

export async function listReviews(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reviews = await adminService.listReviewsForAdmin()
    res.status(200).json({ reviews })
  } catch (error) {
    next(error)
  }
}

export async function listSommelierLogs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit } = req.query as unknown as SommelierLogListQuery
    res.status(200).json(await sommelierLogService.listSommelierLogs(page, limit))
  } catch (error) {
    next(error)
  }
}
