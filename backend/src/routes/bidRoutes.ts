import { Router } from 'express'
import { create, listByAuction } from '../controllers/bidController'
import { authenticate } from '../middlewares/auth'
import { validate } from '../middlewares/validate'
import { auctionIdParamsSchema } from '../validations/auctionValidation'
import { createBidSchema } from '../validations/bidValidation'

const router = Router()

router.get(
  '/auctions/:id/bids',
  validate(auctionIdParamsSchema, 'params'),
  listByAuction,
)

router.post(
  '/auctions/:id/bids',
  authenticate,
  validate(auctionIdParamsSchema, 'params'),
  validate(createBidSchema),
  create,
)

export default router
