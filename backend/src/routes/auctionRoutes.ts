import { Router } from 'express'
import { getById, listPublic } from '../controllers/auctionController'
import { validate } from '../middlewares/validate'
import { auctionIdParamsSchema } from '../validations/auctionValidation'

const router = Router()

router.get('/auctions', listPublic)

router.get(
  '/auctions/:id',
  validate(auctionIdParamsSchema, 'params'),
  getById,
)

export default router
