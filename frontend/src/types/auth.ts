export type UserRole = 'user' | 'admin'

export interface PublicUser {
  id: string
  name: string
  email: string
  avatar: string
  bio: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface RegisterResponse {
  user: PublicUser
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: PublicUser
}

export interface MeResponse {
  user: PublicUser
}

/** Normalize missing/legacy role from older sessions. */
export function resolveUserRole(role: unknown): UserRole {
  return role === 'admin' ? 'admin' : 'user'
}
