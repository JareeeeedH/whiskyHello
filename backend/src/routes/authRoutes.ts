import { Router } from 'express'
import { googleLogin, login, me, register } from '../controllers/authController'
import { authenticate } from '../middlewares/auth'
import { authRateLimit } from '../middlewares/rateLimit'
import { validate } from '../middlewares/validate'
import {
  googleLoginSchema,
  loginSchema,
  registerSchema,
} from '../validations/authValidation'

const router = Router()

router.post('/register', authRateLimit, validate(registerSchema), register)
router.post('/login', authRateLimit, validate(loginSchema), login)
router.post(
  '/google',
  authRateLimit,
  validate(googleLoginSchema),
  googleLogin,
)
router.get('/me', authenticate, me)

export default router
