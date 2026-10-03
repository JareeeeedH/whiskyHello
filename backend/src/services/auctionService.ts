import { Types } from 'mongoose'
import { Auction } from '../models/Auction'
import type { PublicAuction, PublicAuctionDetail } from '../types/auction'
import { AppError } from '../utils/AppError'
import { toPublicAuction } from '../utils/toPublicAuction'
import type {
  CreateAuctionBody,
  UpdateAuctionBody,
} from '../validations/auctionValidation'

function isObjectIdString(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value) && Types.ObjectId.isValid(value)
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

  const { createdBy: _createdBy, ...detail } = toPublicAuction(auction)
  return detail
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

  await auction.save()
  return toPublicAuction(auction)
}

export async function startDraftAuction(
  auctionId: string,
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
  auction.status = 'active'
  await auction.save()
  return toPublicAuction(auction)
}
