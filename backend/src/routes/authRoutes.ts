import { Router } from 'express'
import { register } from '../controllers/authController'
import { validate } from '../middlewares/validate'
import { registerSchema } from '../validations/authValidation'

const router = Router()

router.post('/register', validate(registerSchema), register)

export default router
