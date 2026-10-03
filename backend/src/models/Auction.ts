import { HydratedDocument, InferSchemaType, Model, Schema, model } from 'mongoose'

export const AUCTION_STATUSES = [
  'draft',
  'scheduled',
  'active',
  'ended',
  'cancelled',
] as const

const auctionStatusChangeSchema = new Schema(
  {
    status: {
      type: String,
      enum: AUCTION_STATUSES,
      required: [true, 'Status is required'],
    },
    message: {
      type: String,
      required: [true, 'Status change message is required'],
      trim: true,
      maxlength: [500, 'Status change message must be at most 500 characters'],
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Changed by is required'],
    },
    changedAt: {
      type: Date,
      required: [true, 'Changed at is required'],
    },
  },
  { _id: false },
)

const auctionSchema = new Schema(
  {
    whiskyId: {
      type: String,
      required: [true, 'Whisky id is required'],
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    startingPrice: {
      type: Number,
      required: [true, 'Starting price is required'],
      min: [0, 'Starting price must be at least 0'],
    },
    startAt: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endAt: {
      type: Date,
      required: [true, 'End time is required'],
    },
    status: {
      type: String,
      enum: AUCTION_STATUSES,
      required: [true, 'Status is required'],
    },
    statusHistory: {
      type: [auctionStatusChangeSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

export type AuctionSchemaFields = InferSchemaType<typeof auctionSchema>

export type AuctionDocument = HydratedDocument<AuctionSchemaFields>

export type AuctionModel = Model<AuctionSchemaFields>

export const Auction = model<AuctionSchemaFields, AuctionModel>(
  'Auction',
  auctionSchema,
)
