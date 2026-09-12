import { HydratedDocument, InferSchemaType, Model, Schema, model } from 'mongoose'
import type { UserAttrs } from '../types/user'

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must be at most 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, 'Email must be at most 254 characters'],
    },
    passwordHash: {
      type: String,
      required: false,
      select: false,
    },
    googleId: {
      type: String,
      required: false,
      trim: true,
      index: {
        unique: true,
        sparse: true,
      },
    },
    avatar: {
      type: String,
      default: '',
      trim: true,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Bio must be at most 500 characters'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

export type UserSchemaFields = InferSchemaType<typeof userSchema>

export type UserDocument = HydratedDocument<UserSchemaFields>

export type UserModel = Model<UserSchemaFields>

export const User = model<UserSchemaFields, UserModel>('User', userSchema)

/** Helper alias aligning schema create input with domain attrs. */
export type CreateUserInput = Pick<UserAttrs, 'name' | 'email'> &
  Partial<Pick<UserAttrs, 'passwordHash' | 'googleId' | 'avatar' | 'bio'>>
