import { NextFunction, Request, Response } from 'express'
import { User } from '../models/User'
import { resolveUserRole } from '../types/user'

/**
 * Must run after authenticate.
 * Loads the user from DB and allows only role === 'admin'.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const user = await User.findById(userId).select('role')
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    if (resolveUserRole(user.role) !== 'admin') {
      res.status(403).json({ message: 'Forbidden' })
      return
    }

    next()
  } catch (error) {
    next(error)
  }
}
