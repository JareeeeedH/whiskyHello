import { HydratedDocument, InferSchemaType, Model, Schema, model } from 'mongoose'

/**
 * Email/password sign-ups waiting for the 6-digit email code.
 * A real User is created only after the code is verified.
 */
const pendingRegistrationSchema = new Schema(
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
      required: true,
      select: false,
    },
    codeHash: {
      type: String,
      required: true,
      select: false,
    },
    codeExpiresAt: {
      type: Date,
      required: true,
    },
    lastSentAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

pendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export type PendingRegistrationSchemaFields = InferSchemaType<
  typeof pendingRegistrationSchema
>

export type PendingRegistrationDocument =
  HydratedDocument<PendingRegistrationSchemaFields>

export type PendingRegistrationModel = Model<PendingRegistrationSchemaFields>

export const PendingRegistration = model<
  PendingRegistrationSchemaFields,
  PendingRegistrationModel
>('PendingRegistration', pendingRegistrationSchema)
