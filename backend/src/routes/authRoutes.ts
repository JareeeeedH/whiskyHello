import { Router } from 'express'
import { login, me, register } from '../controllers/authController'
import { authenticate } from '../middlewares/auth'
import { validate } from '../middlewares/validate'
import { loginSchema, registerSchema } from '../validations/authValidation'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.get('/me', authenticate, me)

export default router
