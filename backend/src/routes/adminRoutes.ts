import { Router } from 'express'
import { listUsers } from '../controllers/adminController'
import {
  create,
  list,
  start,
  update,
} from '../controllers/auctionController'
import { authenticate } from '../middlewares/auth'
import { requireAdmin } from '../middlewares/requireAdmin'
import { validate } from '../middlewares/validate'
import {
  auctionIdParamsSchema,
  createAuctionSchema,
  updateAuctionSchema,
} from '../validations/auctionValidation'

const router = Router()

router.get('/users', authenticate, requireAdmin, listUsers)

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

export default router
