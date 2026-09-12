import { User } from '../models/User'
import {
  resolveUserRole,
  type AdminUserListItem,
} from '../types/user'

export async function listUsersForAdmin(): Promise<AdminUserListItem[]> {
  const users = await User.find()
    .select('name email avatar role createdAt')
    .sort({ createdAt: -1 })
    .lean()

  return users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? '',
    role: resolveUserRole(user.role),
    createdAt: user.createdAt,
  }))
}
