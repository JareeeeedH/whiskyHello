import { Router } from 'express'
import {
  googleLogin,
  login,
  me,
  register,
  resendRegistrationCode,
  verifyRegistration,
} from '../controllers/authController'
import { authenticate } from '../middlewares/auth'
import { authRateLimit, emailCodeRateLimit } from '../middlewares/rateLimit'
import { validate } from '../middlewares/validate'
import {
  googleLoginSchema,
  loginSchema,
  registerSchema,
  resendRegistrationCodeSchema,
  verifyRegistrationSchema,
} from '../validations/authValidation'

const router = Router()

router.post('/register', emailCodeRateLimit, validate(registerSchema), register)
router.post(
  '/register/verify',
  authRateLimit,
  validate(verifyRegistrationSchema),
  verifyRegistration,
)
router.post(
  '/register/resend',
  authRateLimit,
  validate(resendRegistrationCodeSchema),
  resendRegistrationCode,
)
router.post('/login', authRateLimit, validate(loginSchema), login)
router.post(
  '/google',
  authRateLimit,
  validate(googleLoginSchema),
  googleLogin,
)
router.get('/me', authenticate, me)

export default router
