import { Router } from 'express'
import { createWhiskyTranslation } from '../controllers/translationController'
import { translationRateLimit } from '../middlewares/rateLimit'
import { validate } from '../middlewares/validate'
import { whiskyTranslationRequestSchema } from '../validations/translationValidation'

const router = Router()

router.post(
  '/whisky-translations',
  translationRateLimit,
  validate(whiskyTranslationRequestSchema),
  createWhiskyTranslation,
)

export default router
