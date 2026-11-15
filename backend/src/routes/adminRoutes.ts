import { Router } from 'express'
import { listReviews, listSommelierLogs, listUsers } from '../controllers/adminController'
import { authenticate } from '../middlewares/auth'
import { requireAdmin } from '../middlewares/requireAdmin'
import { validate } from '../middlewares/validate'
import { sommelierLogListQuerySchema } from '../validations/sommelierValidation'

const router = Router()

router.get('/users', authenticate, requireAdmin, listUsers)

router.get('/reviews', authenticate, requireAdmin, listReviews)

router.get(
  '/sommelier-logs',
  authenticate,
  requireAdmin,
  validate(sommelierLogListQuerySchema, 'query'),
  listSommelierLogs,
)

export default router
