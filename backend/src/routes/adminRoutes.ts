import { Router } from 'express'
import { listReviews, listUsers } from '../controllers/adminController'
import {
  cancel,
  create,
  list,
  remove,
  start,
  update,
} from '../controllers/auctionController'
import { authenticate } from '../middlewares/auth'
import { requireAdmin } from '../middlewares/requireAdmin'
import { validate } from '../middlewares/validate'
import {
  auctionIdParamsSchema,
  cancelAuctionSchema,
  createAuctionSchema,
  updateAuctionSchema,
} from '../validations/auctionValidation'

const router = Router()

router.get('/users', authenticate, requireAdmin, listUsers)

router.get('/reviews', authenticate, requireAdmin, listReviews)

router.get('/auctions', authenticate, requireAdmin, list)

router.post(
  '/auctions',
  authenticate,
  requireAdmin,
  validate(createAuctionSchema),
  create,
)

router.patch(
  '/auctions/:id',
  authenticate,
  requireAdmin,
  validate(auctionIdParamsSchema, 'params'),
  validate(updateAuctionSchema),
  update,
)

router.post(
  '/auctions/:id/start',
  authenticate,
  requireAdmin,
  validate(auctionIdParamsSchema, 'params'),
  start,
)

router.post(
  '/auctions/:id/cancel',
  authenticate,
  requireAdmin,
  validate(auctionIdParamsSchema, 'params'),
  validate(cancelAuctionSchema),
  cancel,
)

router.delete(
  '/auctions/:id',
  authenticate,
  requireAdmin,
  validate(auctionIdParamsSchema, 'params'),
  remove,
)

export default router
