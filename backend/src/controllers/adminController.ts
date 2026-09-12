import { NextFunction, Request, Response } from 'express'
import * as adminService from '../services/adminService'

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
