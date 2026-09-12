import { Router } from 'express'
import authRoutes from './authRoutes'
import reviewRoutes from './reviewRoutes'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'whiskyhello-backend',
  })
})

router.use('/auth', authRoutes)
router.use(reviewRoutes)

export default router
