import { Router } from 'express'
import { createPreference } from '../controllers/sommelierController'
import { sommelierRateLimit } from '../middlewares/rateLimit'
import { validate } from '../middlewares/validate'
import { preferenceRequestSchema } from '../validations/sommelierValidation'

const router = Router()

router.post(
  '/sommelier/preference',
  sommelierRateLimit,
  validate(preferenceRequestSchema),
  createPreference,
)

export default router
