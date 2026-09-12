import type { Types } from 'mongoose'

export type UserRole = 'user' | 'admin'

/** Fields persisted on a User document (passwordHash optional for OAuth users). */
export interface UserAttrs {
  name: string
  email: string
  passwordHash?: string
  googleId?: string
  role: UserRole
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
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

/** Admin user list item (no secrets / bio not required). */
export interface AdminUserListItem {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  createdAt: Date
}

/** Lean / plain object representation of a stored User. */
export interface UserRecord extends UserAttrs {
  _id: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

/** Normalize missing/legacy role values to a safe default. */
export function resolveUserRole(role: unknown): UserRole {
  return role === 'admin' ? 'admin' : 'user'
}
