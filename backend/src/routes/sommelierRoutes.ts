import { Router } from 'express'
import { createRecommendations } from '../controllers/sommelierController'
import { sommelierRateLimit } from '../middlewares/rateLimit'
import { validate } from '../middlewares/validate'
import { recommendationRequestSchema } from '../validations/sommelierValidation'

const router = Router()

router.post(
  '/sommelier/recommendations',
  sommelierRateLimit,
  validate(recommendationRequestSchema),
  createRecommendations,
)

export default router
