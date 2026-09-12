import { Router } from 'express'
import {
  create,
  listByWhisky,
  listMine,
  remove,
  update,
} from '../controllers/reviewController'
import { authenticate } from '../middlewares/auth'
import { validate } from '../middlewares/validate'
import {
  createReviewSchema,
  reviewIdParamsSchema,
  updateReviewSchema,
  whiskyIdParamsSchema,
} from '../validations/reviewValidation'

const router = Router()

router.get(
  '/whiskies/:whiskyId/reviews',
  validate(whiskyIdParamsSchema, 'params'),
  listByWhisky,
)

router.post('/reviews', authenticate, validate(createReviewSchema), create)

router.patch(
  '/reviews/:id',
  authenticate,
  validate(reviewIdParamsSchema, 'params'),
  validate(updateReviewSchema),
  update,
)

router.delete(
  '/reviews/:id',
  authenticate,
  validate(reviewIdParamsSchema, 'params'),
  remove,
)

router.get('/me/reviews', authenticate, listMine)

export default router
