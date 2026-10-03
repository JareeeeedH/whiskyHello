import { HydratedDocument, InferSchemaType, Model, Schema, model } from 'mongoose'

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
      enum: ['draft', 'scheduled', 'active', 'ended', 'cancelled'],
      required: [true, 'Status is required'],
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
