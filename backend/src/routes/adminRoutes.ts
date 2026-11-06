import { Router } from 'express'
import { listReviews, listUsers } from '../controllers/adminController'
import { authenticate } from '../middlewares/auth'
import { requireAdmin } from '../middlewares/requireAdmin'

const router = Router()

router.get('/users', authenticate, requireAdmin, listUsers)

router.get('/reviews', authenticate, requireAdmin, listReviews)

export default router
