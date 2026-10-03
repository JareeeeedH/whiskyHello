import { Types } from 'mongoose'
import { Auction, type AuctionDocument } from '../models/Auction'
import type {
  AuctionStatus,
  PublicAuction,
  PublicAuctionDetail,
} from '../types/auction'
import { AppError } from '../utils/AppError'
import { toPublicAuction } from '../utils/toPublicAuction'
import {
  END_AT_AFTER_START_AT_MESSAGE,
  type CancelAuctionBody,
  type CreateAuctionBody,
  type UpdateAuctionBody,
} from '../validations/auctionValidation'

const CANCELLABLE_STATUSES: AuctionStatus[] = ['draft', 'scheduled', 'active']

function isObjectIdString(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value) && Types.ObjectId.isValid(value)
}

function toPublicAuctionDetail(auction: AuctionDocument): PublicAuctionDetail {
  const {
    createdBy: _createdBy,
    statusHistory: _statusHistory,
    ...detail
  } = toPublicAuction(auction)
  return detail
}

/** Active auctions (soonest endAt first), then scheduled auctions (soonest startAt first). */
export async function listPublicAuctions(
  now = new Date(),
): Promise<PublicAuctionDetail[]> {
  const [active, scheduled] = await Promise.all([
    Auction.find({ status: 'active', endAt: { $gt: now } }).sort({
      endAt: 1,
      _id: 1,
    }),
    Auction.find({ status: 'scheduled', endAt: { $gt: now } }).sort({
      startAt: 1,
      _id: 1,
    }),
  ])

  return [...active, ...scheduled].map((auction) =>
    toPublicAuctionDetail(auction),
  )
}

export async function getPublicAuctionById(
  auctionId: string,
): Promise<PublicAuctionDetail> {
  if (!isObjectIdString(auctionId)) {
    throw new AppError(400, 'Invalid auction id')
  }

  const auction = await Auction.findById(auctionId)
  if (!auction || auction.status === 'draft') {
    throw new AppError(404, 'Auction not found')
  }

  return toPublicAuctionDetail(auction)
}

export async function activateScheduledAuctions(
  now = new Date(),
): Promise<number> {
  const result = await Auction.updateMany(
    { status: 'scheduled', startAt: { $lte: now } },
    { $set: { status: 'active' } },
  )
  return result.modifiedCount
}

export async function closeExpiredAuctions(now = new Date()): Promise<number> {
  const result = await Auction.updateMany(
    { status: 'active', endAt: { $lte: now } },
    { $set: { status: 'ended' } },
  )
  return result.modifiedCount
}

export async function listAuctionsForAdmin(): Promise<PublicAuction[]> {
  const auctions = await Auction.find().sort({ createdAt: -1 })
  return auctions.map((auction) => toPublicAuction(auction))
}

export async function createAuction(
  adminUserId: string,
  input: CreateAuctionBody,
): Promise<PublicAuction> {
  if (!isObjectIdString(adminUserId)) {
    throw new AppError(400, 'Invalid user id')
  }

  const auction = await Auction.create({
    whiskyId: input.whiskyId,
    createdBy: new Types.ObjectId(adminUserId),
    title: input.title,
    description: input.description,
    startingPrice: input.startingPrice,
    startAt: input.startAt,
    endAt: input.endAt,
    status: 'draft',
  })

  return toPublicAuction(auction)
}

export async function updateDraftAuction(
  auctionId: string,
  input: UpdateAuctionBody,
): Promise<PublicAuction> {
  if (!isObjectIdString(auctionId)) {
    throw new AppError(400, 'Invalid auction id')
  }

  const auction = await Auction.findById(auctionId)
  if (!auction) {
    throw new AppError(404, 'Auction not found')
  }

  if (auction.status !== 'draft') {
    throw new AppError(400, 'Only draft auctions can be edited')
  }

  if (input.whiskyId !== undefined) auction.whiskyId = input.whiskyId
  if (input.title !== undefined) auction.title = input.title
  if (input.description !== undefined) auction.description = input.description
  if (input.startingPrice !== undefined) {
    auction.startingPrice = input.startingPrice
  }
  if (input.startAt !== undefined) auction.startAt = input.startAt
  if (input.endAt !== undefined) auction.endAt = input.endAt

  if (auction.endAt.getTime() <= auction.startAt.getTime()) {
    throw new AppError(400, 'Validation failed', [END_AT_AFTER_START_AT_MESSAGE])
  }

  await auction.save()
  return toPublicAuction(auction)
}

export async function startDraftAuction(
  auctionId: string,
  now = new Date(),
): Promise<PublicAuction> {
  if (!isObjectIdString(auctionId)) {
    throw new AppError(400, 'Invalid auction id')
  }

  const auction = await Auction.findById(auctionId)
  if (!auction) {
    throw new AppError(404, 'Auction not found')
  }

  if (auction.status !== 'draft') {
    throw new AppError(400, 'Only draft auctions can be started')
  }

  await auction.validate()

  if (auction.endAt.getTime() <= auction.startAt.getTime()) {
    throw new AppError(400, 'Validation failed', [END_AT_AFTER_START_AT_MESSAGE])
  }

  if (now.getTime() >= auction.endAt.getTime()) {
    throw new AppError(400, 'Auction end time has already passed')
  }

  auction.status =
    now.getTime() < auction.startAt.getTime() ? 'scheduled' : 'active'
  await auction.save()
  return toPublicAuction(auction)
}

export async function cancelAuction(
  auctionId: string,
  adminUserId: string,
  input: CancelAuctionBody,
  now = new Date(),
): Promise<PublicAuction> {
  if (!isObjectIdString(auctionId)) {
    throw new AppError(400, 'Invalid auction id')
  }
  if (!isObjectIdString(adminUserId)) {
    throw new AppError(400, 'Invalid user id')
  }

  // Conditional update so a concurrent lifecycle transition cannot be overwritten.
  const cancelled = await Auction.findOneAndUpdate(
    { _id: auctionId, status: { $in: CANCELLABLE_STATUSES } },
    {
      $set: { status: 'cancelled' },
      $push: {
        statusHistory: {
          status: 'cancelled',
          message: input.message,
          changedBy: new Types.ObjectId(adminUserId),
          changedAt: now,
        },
      },
    },
    { returnDocument: 'after', runValidators: true },
  )

  if (cancelled) {
    return toPublicAuction(cancelled)
  }

  const exists = await Auction.exists({ _id: auctionId })
  if (!exists) {
    throw new AppError(404, 'Auction not found')
  }

  throw new AppError(
    400,
    'Only draft, scheduled or active auctions can be cancelled',
  )
}
