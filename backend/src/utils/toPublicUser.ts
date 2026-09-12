import type { UserDocument } from '../models/User'
import { resolveUserRole, type PublicUser } from '../types/user'

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    role: resolveUserRole(user.role),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
