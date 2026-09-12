import type { Types } from 'mongoose'

/** Fields persisted on a User document (passwordHash optional for OAuth users). */
export interface UserAttrs {
  name: string
  email: string
  passwordHash?: string
  googleId?: string
  avatar: string
  bio: string
}

/** Public user shape safe to return from APIs (no passwordHash / googleId). */
export interface PublicUser {
  id: string
  name: string
  email: string
  avatar: string
  bio: string
  createdAt: Date
  updatedAt: Date
}

/** Lean / plain object representation of a stored User. */
export interface UserRecord extends UserAttrs {
  _id: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}
