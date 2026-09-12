import { HydratedDocument, InferSchemaType, Model, Schema, Types, model } from 'mongoose'

const reviewSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User id is required'],
      index: true,
    },
    whiskyId: {
      type: String,
      required: [true, 'Whisky id is required'],
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [120, 'Title must be at most 120 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      maxlength: [5000, 'Content must be at most 5000 characters'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [0, 'Rating must be at least 0'],
      max: [100, 'Rating must be at most 100'],
    },
    nose: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Nose must be at most 1000 characters'],
    },
    taste: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Taste must be at most 1000 characters'],
    },
    finish: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Finish must be at most 1000 characters'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

reviewSchema.index({ whiskyId: 1, createdAt: -1 })
reviewSchema.index({ userId: 1, createdAt: -1 })

export type ReviewSchemaFields = InferSchemaType<typeof reviewSchema>

export type ReviewDocument = HydratedDocument<ReviewSchemaFields>

export type ReviewModel = Model<ReviewSchemaFields>

export const Review = model<ReviewSchemaFields, ReviewModel>(
  'Review',
  reviewSchema,
)

export function isObjectIdString(value: string): boolean {
  return Types.ObjectId.isValid(value)
}
