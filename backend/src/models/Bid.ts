import { HydratedDocument, InferSchemaType, Model, Schema, model } from 'mongoose'

const bidSchema = new Schema(
  {
    auctionId: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: [true, 'Auction id is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User id is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be at least 0'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be an integer',
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

bidSchema.index({ auctionId: 1, createdAt: -1 })
bidSchema.index({ auctionId: 1, amount: -1 })
bidSchema.index({ auctionId: 1, amount: 1 }, { unique: true })

export type BidSchemaFields = InferSchemaType<typeof bidSchema>

export type BidDocument = HydratedDocument<BidSchemaFields>

export type BidModel = Model<BidSchemaFields>

export const Bid = model<BidSchemaFields, BidModel>('Bid', bidSchema)
