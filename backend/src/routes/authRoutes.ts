import { Router } from 'express'
import {
  forgotPassword,
  googleLogin,
  login,
  me,
  register,
  resendRegistrationCode,
  resetPassword,
  verifyRegistration,
} from '../controllers/authController'
import { authenticate } from '../middlewares/auth'
import { authRateLimit, emailCodeRateLimit } from '../middlewares/rateLimit'
import { validate } from '../middlewares/validate'
import {
  forgotPasswordSchema,
  googleLoginSchema,
  loginSchema,
  registerSchema,
  resendRegistrationCodeSchema,
  resetPasswordSchema,
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
  emailCodeRateLimit,
  validate(resendRegistrationCodeSchema),
  resendRegistrationCode,
)
router.post(
  '/password/forgot',
  emailCodeRateLimit,
  validate(forgotPasswordSchema),
  forgotPassword,
)
router.post(
  '/password/reset',
  authRateLimit,
  validate(resetPasswordSchema),
  resetPassword,
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
