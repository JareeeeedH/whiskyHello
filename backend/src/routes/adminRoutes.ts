import { Router } from 'express'
import { listUsers } from '../controllers/adminController'
import { authenticate } from '../middlewares/auth'
import { requireAdmin } from '../middlewares/requireAdmin'

const router = Router()

router.get('/users', authenticate, requireAdmin, listUsers)

export default router
