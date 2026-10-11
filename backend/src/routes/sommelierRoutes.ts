import { Router } from 'express'
import { createRecommendations } from '../controllers/sommelierController'
import { optionalAuthenticate } from '../middlewares/auth'
import { sommelierRateLimit } from '../middlewares/rateLimit'
import { sommelierDailyQuota } from '../middlewares/sommelierQuota'
import { validate } from '../middlewares/validate'
import { recommendationRequestSchema } from '../validations/sommelierValidation'

const router = Router()

router.post(
  '/sommelier/recommendations',
  sommelierRateLimit,
  optionalAuthenticate,
  validate(recommendationRequestSchema),
  sommelierDailyQuota,
  createRecommendations,
)

export default router
