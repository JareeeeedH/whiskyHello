import { Types } from 'mongoose'
import { Auction, type AuctionDocument } from '../models/Auction'
import { Bid } from '../models/Bid'
import type { PublicBid } from '../types/bid'
import { AppError } from '../utils/AppError'
import { toPublicBid } from '../utils/toPublicBid'
import type { CreateBidBody } from '../validations/bidValidation'

export const BID_INCREMENT = 100
export const DUPLICATE_BID_AMOUNT_MESSAGE = '此價格已被其他競標者搶先出價，請重新出價。'
export const EXTENSION_WINDOW_MS = 60 * 1000
export const EXTENSION_MS = 2 * 60 * 1000

function isObjectIdString(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value) && Types.ObjectId.isValid(value)
}

async function findPublicAuction(auctionId: string): Promise<AuctionDocument> {
  if (!isObjectIdString(auctionId)) {
    throw new AppError(400, 'Invalid auction id')
  }

  const auction = await Auction.findById(auctionId)
  if (!auction || auction.status === 'draft') {
    throw new AppError(404, 'Auction not found')
  }

  return auction
}

function isDuplicateBidAmountError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const err = error as { code?: number; keyPattern?: Record<string, unknown> }
  return err.code === 11000 && Boolean(err.keyPattern?.auctionId && err.keyPattern?.amount)
}

async function findHighestAmount(
  auctionId: Types.ObjectId,
): Promise<number | null> {
  const highest = await Bid.findOne({ auctionId }).sort({ amount: -1 })
  return highest ? highest.amount : null
}

export async function listBidsForAuction(
  auctionId: string,
): Promise<{ bids: PublicBid[]; currentPrice: number }> {
  const auction = await findPublicAuction(auctionId)

  const bids = await Bid.find({ auctionId: auction._id })
    .sort({ createdAt: -1, _id: -1 })
    .populate('userId', 'name')
  const highestAmount = await findHighestAmount(auction._id)

  return {
    bids: bids.map((bid) => toPublicBid(bid)),
    currentPrice: highestAmount ?? auction.startingPrice,
  }
}

export async function createBid(
  auctionId: string,
  userId: string,
  input: CreateBidBody,
): Promise<{ bid: PublicBid; currentPrice: number; endAt: Date }> {
  if (!isObjectIdString(userId)) {
    throw new AppError(400, 'Invalid user id')
  }

  const auction = await findPublicAuction(auctionId)

  if (auction.status !== 'active') {
    throw new AppError(400, 'Only active auctions accept bids')
  }

  const now = Date.now()
  if (now >= auction.endAt.getTime()) {
    throw new AppError(400, 'Auction has ended')
  }

  const highestAmount = await findHighestAmount(auction._id)
  const minimumAmount =
    highestAmount === null ? auction.startingPrice : highestAmount + BID_INCREMENT

  if (input.amount < minimumAmount) {
    throw new AppError(400, `Bid amount must be at least ${minimumAmount}`)
  }

  let bid
  try {
    bid = await Bid.create({
      auctionId: auction._id,
      userId: new Types.ObjectId(userId),
      amount: input.amount,
    })
  } catch (error) {
    if (isDuplicateBidAmountError(error)) {
      throw new AppError(400, DUPLICATE_BID_AMOUNT_MESSAGE)
    }
    throw error
  }

  let endAt = auction.endAt
  if (auction.endAt.getTime() - now <= EXTENSION_WINDOW_MS) {
    const extendedEndAt = new Date(now + EXTENSION_MS)
    await Auction.updateOne(
      { _id: auction._id, status: 'active', endAt: { $lt: extendedEndAt } },
      { $set: { endAt: extendedEndAt } },
    )
    const latest = await Auction.findById(auction._id).select('endAt')
    endAt = latest?.endAt ?? extendedEndAt
  }

  await bid.populate('userId', 'name')
  return { bid: toPublicBid(bid), currentPrice: bid.amount, endAt }
}
