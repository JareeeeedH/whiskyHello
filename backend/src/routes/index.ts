import { Router } from 'express'
import adminRoutes from './adminRoutes'
import auctionRoutes from './auctionRoutes'
import authRoutes from './authRoutes'
import bidRoutes from './bidRoutes'
import reviewRoutes from './reviewRoutes'
import sommelierRoutes from './sommelierRoutes'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'whiskyhello-backend',
  })
})

router.use('/auth', authRoutes)
router.use('/admin', adminRoutes)
router.use(reviewRoutes)
router.use(auctionRoutes)
router.use(bidRoutes)
router.use(sommelierRoutes)

export default router
